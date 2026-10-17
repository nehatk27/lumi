import type { JSX } from 'react'
import idle from '../assets/lumi-idle.png'

export default function Mascot(): JSX.Element {
  return (
    <div className="mascot">
      <img
        className="mascot__img"
        src={idle}
        alt="Lumi, your water reminder companion"
        draggable={false}
      />
    </div>
  )
}
