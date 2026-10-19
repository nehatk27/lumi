import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { LUMI_H, LUMI_W } from '../../../shared/layout'
import Mascot from './Mascot'
import modelUrl from '../assets/lumi.glb?url'

const MODEL_HEIGHT = 1.8
const FACE_ROTATION_Y = 0 // Math.PI if she faces away from the camera
const STEPS_PER_SEC = 3
const WALK_TIME_SCALE = 1 // lower = slower legs. Tune until her feet stop sliding.
const WAVE_TIME_SCALE = 1

interface LumiModel {
  root: THREE.Group
  clips: THREE.AnimationClip[]
}

let modelPromise: Promise<LumiModel> | null = null

function loadModel(): Promise<LumiModel> {
  modelPromise ??= (async (): Promise<LumiModel> => {
    const gltf = await new GLTFLoader().loadAsync(modelUrl)

    let skinnedMeshes = 0
    let triangles = 0
    const bones = new Set<string>()
    gltf.scene.traverse((obj) => {
      const mesh = obj as THREE.SkinnedMesh
      if (mesh.isSkinnedMesh) {
        skinnedMeshes += 1
        mesh.skeleton.bones.forEach((b) => bones.add(b.name))
      }
      if ((obj as THREE.Mesh).isMesh) {
        const g = (obj as THREE.Mesh).geometry
        triangles += (g.index ? g.index.count : g.attributes.position.count) / 3
      }
    })
    console.info('[Lumi 3D] model report', {
      triangles: Math.round(triangles),
      skinnedMeshes,
      bones: bones.size,
      boneNames: [...bones].slice(0, 80),
      animations: gltf.animations.map((c) => `${c.name} (${c.duration.toFixed(2)}s)`)
    })

    const box = new THREE.Box3().setFromObject(gltf.scene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    gltf.scene.position.set(-center.x, -box.min.y, -center.z)
    const root = new THREE.Group()
    root.add(gltf.scene)
    root.scale.setScalar(MODEL_HEIGHT / size.y)
    return { root, clips: gltf.animations }
  })().catch((err) => {
    modelPromise = null
    throw err
  })
  return modelPromise
}

function findClip(clips: THREE.AnimationClip[], pattern: RegExp): THREE.AnimationClip | undefined {
  return clips.find((c) => pattern.test(c.name))
}

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

interface Props {
  happy?: boolean
  walking?: boolean
  waving?: boolean
  /** Y rotation in radians: 0 faces the viewer, +PI/2 faces right, -PI/2 faces left. */
  heading?: number
}

export default function Mascot3D({
  happy = false,
  walking = false,
  waving = false,
  heading = 0
}: Props): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const happyRef = useRef(happy)
  const walkingRef = useRef(walking)
  const wavingRef = useRef(waving)
  const headingRef = useRef(heading)
  const moodRef = useRef<((isHappy: boolean) => void) | null>(null)
  const [failed, setFailed] = useState(() => !isWebGLAvailable())

  useEffect(() => {
    walkingRef.current = walking
    wavingRef.current = waving
    headingRef.current = heading
  }, [walking, waving, heading])

  useEffect(() => {
    happyRef.current = happy
    moodRef.current?.(happy)
  }, [happy])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    } catch (err) {
      console.error('[Lumi 3D] renderer creation failed, using 2D Lumi', err)
      queueMicrotask(() => setFailed(true))
      return
    }
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(LUMI_W, LUMI_H)
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(30, LUMI_W / LUMI_H, 0.1, 100)
    const viewHeight = MODEL_HEIGHT * 1.25 // headroom so hops don't clip
    const distance = viewHeight / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const camY = viewHeight / 2 - 0.05
    camera.position.set(0, camY, distance)
    camera.lookAt(0, camY, 0)

    scene.add(new THREE.HemisphereLight(0xffffff, 0xcdb9a5, 1.6))
    const key = new THREE.DirectionalLight(0xffffff, 2.2)
    key.position.set(2, 3, 4)
    scene.add(key)

    // rig = motion in screen space (bob, lean, squash); model = facing direction
    const rig = new THREE.Group()
    scene.add(rig)

    let disposed = false
    let raf = 0
    let last = performance.now()
    let elapsed = 0
    let model: THREE.Group | null = null
    let mixer: THREE.AnimationMixer | null = null
    let current: THREE.AnimationAction | null = null
    let happyNow = false
    let walkingNow = false
    let wavingNow = false
    let hopStart = 0
    let walkBlend = 0
    let stepPhase = 0
    let facing = headingRef.current
    const actions: {
      idle?: THREE.AnimationAction
      happy?: THREE.AnimationAction
      walk?: THREE.AnimationAction
      wave?: THREE.AnimationAction
    } = {}

    // Priority: walking > waving > happy > idle
    const choose = (): void => {
      if (!mixer) return
      const next =
        walkingNow && actions.walk
          ? actions.walk
          : wavingNow && actions.wave
            ? actions.wave
            : happyNow
              ? (actions.happy ?? actions.idle)
              : actions.idle
      if (!next || next === current) return
      next.reset().fadeIn(0.25).play()
      current?.fadeOut(0.25)
      current = next
    }

    const setMood = (isHappy: boolean): void => {
      happyNow = isHappy
      hopStart = elapsed
      choose()
    }
    moodRef.current = setMood

    loadModel()
      .then(({ root, clips }) => {
        if (disposed) return
        model = root
        rig.add(root)
        if (clips.length > 0) {
          mixer = new THREE.AnimationMixer(root)
          const walkClip = findClip(clips, /walk/i)
          const waveClip = findClip(clips, /wave|hello|greet/i)
          const happyClip = findClip(clips, /happy|dance|celebr|cheer|jump|victory/i)
          const idleClip =
            findClip(clips, /idle|stand|breath/i) ??
            clips.find((c) => c !== walkClip && c !== waveClip && c !== happyClip) ??
            clips[0]
          actions.idle = mixer.clipAction(idleClip)
          if (walkClip) {
            actions.walk = mixer.clipAction(walkClip)
            actions.walk.timeScale = WALK_TIME_SCALE
          }
          if (waveClip) {
            actions.wave = mixer.clipAction(waveClip)
            actions.wave.timeScale = WAVE_TIME_SCALE
          }
          if (happyClip) actions.happy = mixer.clipAction(happyClip)
        }
        setMood(happyRef.current)
      })
      .catch((err) => {
        console.error('[Lumi 3D] failed to load model, using 2D Lumi', err)
        if (!disposed) setFailed(true)
      })

    const tick = (): void => {
      raf = requestAnimationFrame(tick)
      const now = performance.now()
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      elapsed += dt

      mixer?.update(dt)

      // Blend between idle and walking, and turn smoothly toward the heading
      walkBlend += ((walkingRef.current ? 1 : 0) - walkBlend) * Math.min(1, dt * 6)
      facing += (headingRef.current - facing) * Math.min(1, dt * 8)
      if (walkBlend > 0.01) stepPhase += dt * STEPS_PER_SEC * Math.PI

      walkingNow = walkingRef.current
      wavingNow = wavingRef.current
      choose()

      const rigged = !!mixer // real animation: don't add fake bobbing on top
      const k = actions.walk ? 0 : walkBlend // fake walk only if there's no walk clip
      const idleK = rigged ? 0 : 1
      const helloFx = wavingNow && !actions.wave ? 1 : 0 // fake "hello" only if there's no wave clip
      const s = Math.sin(stepPhase)
      const dir = Math.sign(headingRef.current)
      const idleBob = Math.sin(elapsed * 2) * 0.02 * idleK
      const idleSway = Math.sin(elapsed * 1.5) * 0.02 * idleK
      const hopT = Math.min((elapsed - hopStart) / 0.6, 1)
      const hop = happyNow && hopT < 1 && !actions.happy ? Math.sin(hopT * Math.PI) * 0.25 : 0
      const squash = (Math.abs(s) - 0.5) * 0.06 * k
      const helloBounce = Math.abs(Math.sin(elapsed * 4.5)) * 0.06 * helloFx
      const helloSway = Math.sin(elapsed * 9) * 0.06 * helloFx

      rig.position.y = idleBob * (1 - k) + Math.abs(s) * 0.07 * k + hop + helloBounce
      rig.rotation.z = idleSway * (1 - k) + (-dir * 0.08 + s * 0.07) * k + helloSway
      rig.scale.set(1 - squash, 1 + squash, 1 - squash)
      if (model) model.rotation.y = FACE_ROTATION_Y + facing

      renderer.render(scene, camera)
    }
    tick()

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      moodRef.current = null
      mixer?.stopAllAction()
      if (mixer && model) mixer.uncacheRoot(model)
      if (model) rig.remove(model)
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [])

  if (failed) return <Mascot happy={happy} />

  return <div ref={hostRef} className={happy ? 'mascot3d mascot3d--happy' : 'mascot3d'} />
}
