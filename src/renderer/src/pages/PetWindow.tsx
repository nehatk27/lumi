import type { JSX } from 'react'
import Mascot from '../components/Mascot'
import '../styles/pet.css'

export default function PetWindow(): JSX.Element {
  return (
    <div className="pet">
      <Mascot />
    </div>
  )
}
