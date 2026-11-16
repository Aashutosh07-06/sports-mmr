import { Compass } from 'lucide-react'
import Button from '../components/ui/Button'
import { EmptyState } from '../components/ui/States'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
      <EmptyState icon={Compass} title="Page not found" action={<Button to="/">Back to home</Button>}>
        The page you are looking for does not exist.
      </EmptyState>
    </div>
  )
}
