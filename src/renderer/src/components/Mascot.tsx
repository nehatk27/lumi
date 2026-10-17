import type { JSX } from 'react'
import idleImg from '../assets/lumi-idle.png'
import happyImg from '../assets/lumi-happy.png'

export default function Mascot({ happy = false }: { happy?: boolean }): JSX.Element {
  return (
    <div className={happy ? 'mascot mascot--happy' : 'mascot'}>
      <img
        className="mascot__img"
        src={happy ? happyImg : idleImg}
        alt="Lumi, your water reminder companion"
        draggable={false}
      />
    </div>
  )
}
