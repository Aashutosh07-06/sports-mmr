"""API tests: endpoints, real predictions for every game, validation and error handling."""
import math

import pytest

from conftest import GAMES, default_inputs
from app.services.registry import ModelRegistry


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert set(body["games"]) == set(GAMES)


def test_games_list_has_honest_targets(client):
    r = client.get("/api/games")
    assert r.status_code == 200
    games = {g["key"]: g for g in r.json()}
    assert set(games) == set(GAMES)
    for g in games.values():
        assert g["status"] == "ready"
        assert "MMR" not in g["target_name"]          # no target is mislabelled as MMR
        assert g["not_mmr_note"]
        assert 0 <= g["headline_metric"]["value"] <= 1


@pytest.mark.parametrize("game", GAMES)
def test_model_info(client, game):
    r = client.get(f"/api/model-info/{game}")
    assert r.status_code == 200
    body = r.json()
    assert body["schema"]["game"] == game
    assert len(body["schema"]["inputs"]) >= 5
    assert any(m["selected"] for m in body["metrics"]["models"])


@pytest.mark.parametrize("game", GAMES)
def test_predict_returns_real_prediction_and_explanation(client, game):
    r = client.post(f"/api/predict/{game}", json={"inputs": default_inputs(game)})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "success" and body["game"] == game
    assert 0.0 <= body["prediction"] <= 4.0
    assert body["interpretation"]["summary"]
    exp = body["explanation"]
    assert len(exp["contributions"]) == len(client.get(f"/api/model-info/{game}").json()["schema"]["model_features"])
    # SHAP additivity: base value + sum(contributions) == model output
    total = exp["base_value"] + sum(c["contribution"] for c in exp["contributions"])
    assert math.isclose(total, exp["model_output"], rel_tol=1e-3, abs_tol=1e-3)
    assert isinstance(body["id"], int)


def test_better_stats_give_higher_csgo_rating(client):
    base = default_inputs("csgo")
    strong = {**base, "kills": 30, "deaths": 10, "adr": 120, "kast": 85, "headshots": 15}
    weak = {**base, "kills": 6, "deaths": 22, "adr": 45, "kast": 50, "headshots": 3}
    p_strong = client.post("/api/predict/csgo", json={"inputs": strong}).json()["prediction"]
    p_weak = client.post("/api/predict/csgo", json={"inputs": weak}).json()["prediction"]
    assert p_strong > p_weak


def test_dota_probability_bounds(client):
    body = client.post("/api/predict/dota2", json={"inputs": default_inputs("dota2")}).json()
    assert 0.0 <= body["prediction"] <= 1.0
    assert body["explanation"]["units"].startswith("log-odds")


def test_explain_endpoint_does_not_store_history(client):
    before = len(client.get("/api/predictions/history?limit=500").json())
    r = client.post("/api/explain/pubg", json={"inputs": default_inputs("pubg")})
    assert r.status_code == 200 and r.json()["explanation"]["contributions"]
    assert len(client.get("/api/predictions/history?limit=500").json()) == before


def test_unknown_game_404(client):
    assert client.post("/api/predict/fortnite", json={"inputs": {}}).status_code == 404
    assert client.get("/api/model-info/fortnite").status_code == 404


def test_missing_feature_422(client):
    inputs = default_inputs("csgo")
    inputs.pop("kills")
    r = client.post("/api/predict/csgo", json={"inputs": inputs})
    assert r.status_code == 422
    assert any(e["field"] == "kills" for e in r.json()["errors"])


def test_wrong_type_422(client):
    inputs = {**default_inputs("valorant"), "kills": "lots"}
    r = client.post("/api/predict/valorant", json={"inputs": inputs})
    assert r.status_code == 422
    assert r.json()["errors"][0]["field"] == "kills"


def test_out_of_range_and_bad_category_422(client):
    r = client.post("/api/predict/pubg", json={"inputs": {**default_inputs("pubg"), "kills": -3}})
    assert r.status_code == 422
    r = client.post("/api/predict/pubg", json={"inputs": {**default_inputs("pubg"), "match_type": "octo"}})
    assert r.status_code == 422


def test_unknown_field_rejected(client):
    r = client.post("/api/predict/dota2", json={"inputs": {**default_inputs("dota2"), "mmr": 5000}})
    assert r.status_code == 422


def test_cross_field_validation(client):
    r = client.post("/api/predict/csgo", json={"inputs": {**default_inputs("csgo"), "kills": 5, "headshots": 9}})
    assert r.status_code == 422
    assert "Headshot" in r.json()["errors"][0]["message"]


def test_malformed_body_422(client):
    assert client.post("/api/predict/csgo", json={"wrong": 1}).status_code == 422


def test_history_and_detail(client):
    created = client.post("/api/predict/valorant", json={"inputs": default_inputs("valorant")}).json()
    items = client.get("/api/predictions/history?game=valorant").json()
    assert items and items[0]["id"] == created["id"]
    detail = client.get(f"/api/predictions/{created['id']}").json()
    assert detail["prediction"] == created["prediction"]
    assert client.get("/api/predictions/999999").status_code == 404


@pytest.mark.parametrize("game", GAMES)
def test_analytics(client, game):
    body = client.get(f"/api/analytics/{game}").json()
    assert body["feature_importance"] and body["model_comparison"]
    assert body["dataset"]["clean_rows"] > 0
    assert ("actual_vs_predicted" in body) or ("roc_curve" in body)


def test_experiments(client):
    body = client.get("/api/experiments").json()
    assert "dota2_trueskill" in body and "valorant_ranked" in body


def test_model_unavailable_returns_503(client, tmp_path, monkeypatch):
    from app.api import routes
    empty = ModelRegistry(artifacts_dir=tmp_path, games=["csgo"]).load()
    assert empty.get("csgo").status == "unavailable"
    monkeypatch.setattr(routes, "registry", empty)
    r = client.post("/api/predict/csgo", json={"inputs": {}})
    assert r.status_code == 503
    assert "not trained" in r.json()["detail"]
    games = client.get("/api/games").json()
    assert games[0]["status"] == "unavailable"
