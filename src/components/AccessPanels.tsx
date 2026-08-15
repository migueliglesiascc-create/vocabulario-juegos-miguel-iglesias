import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, KeyRound, LockKeyhole, School, ShieldCheck, UsersRound } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type Language = 'es' | 'en'

type AccessProps = {
  language: Language
  onBack: () => void
}

const classes = [
  'Período 0 - Spanish 1/2',
  'Período 1 - AP Spanish',
  'Período 2 - Spanish 1/2',
  'Período 3 - Spanish 1/2',
  'Período 4 - Spanish 1/2',
]

export function TeacherAccess({ language, onBack }: AccessProps) {
  const es = language === 'es'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function signIn(event: FormEvent) {
    event.preventDefault()
    if (!supabase) {
      setMessage(es ? 'Falta conectar la clave pública de Supabase.' : 'The Supabase public key still needs to be connected.')
      return
    }

    setLoading(true)
    setMessage('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !data.user) {
      setMessage(es ? 'Correo o contraseña incorrectos.' : 'Incorrect email or password.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('teacher_profiles')
      .select('role')
      .eq('user_id', data.user.id)
      .maybeSingle()

    if (profile?.role !== 'teacher') {
      await supabase.auth.signOut()
      setMessage(es ? 'Esta cuenta no tiene autorización de profesor.' : 'This account is not authorized as a teacher.')
    } else {
      setMessage(es ? 'Acceso docente verificado. El panel será el siguiente bloque.' : 'Teacher access verified. The dashboard is the next block.')
    }
    setLoading(false)
  }

  return (
    <AccessLayout onBack={onBack} language={language} icon={<ShieldCheck size={30} />} title={es ? 'Acceso del profesor' : 'Teacher access'} subtitle={es ? 'Solo las cuentas docentes autorizadas pueden entrar.' : 'Only authorized teacher accounts can sign in.'}>
      <form className="access-form" onSubmit={signIn}>
        <label>{es ? 'Correo electrónico' : 'Email'}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label>
        <label>{es ? 'Contraseña' : 'Password'}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
        <button className="primary-action" disabled={loading} type="submit"><LockKeyhole size={18} />{loading ? (es ? 'Verificando…' : 'Checking…') : (es ? 'Entrar de forma segura' : 'Secure sign in')}</button>
        {!isSupabaseConfigured && <p className="setup-note">{es ? 'Configuración pendiente: añadiremos la clave pública de Supabase en el siguiente paso.' : 'Setup pending: we will add the Supabase public key in the next step.'}</p>}
        {message && <p className="form-message" role="status">{message}</p>}
      </form>
    </AccessLayout>
  )
}

export function StudentAccess({ language, onBack }: AccessProps) {
  const es = language === 'es'
  const sessionFromUrl = new URLSearchParams(window.location.search).get('session')?.toUpperCase() || ''
  const [code, setCode] = useState(sessionFromUrl)
  const [sessionName, setSessionName] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (sessionFromUrl) void validateSession(sessionFromUrl)
  }, [])

  async function validateSession(value = code) {
    const normalizedCode = value.trim().toUpperCase()
    if (!normalizedCode) return
    if (!supabase) {
      setMessage(es ? 'Falta conectar la clave pública de Supabase.' : 'The Supabase public key still needs to be connected.')
      return
    }

    setLoading(true)
    setMessage('')
    const { data, error } = await supabase.rpc('get_public_session', { requested_code: normalizedCode })
    const session = Array.isArray(data) ? data[0] : data
    if (error || !session) {
      setSessionName('')
      setMessage(es ? 'La sesión no existe o no está abierta.' : 'The session does not exist or is not open.')
    } else {
      setCode(normalizedCode)
      setSessionName(session.session_name)
    }
    setLoading(false)
  }

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    const values = new FormData(event.currentTarget)
    setLoading(true)
    setMessage('')
    const { data, error } = await supabase.rpc('join_public_session', {
      requested_code: code,
      requested_first_name: String(values.get('first_name') || ''),
      requested_last_name: String(values.get('last_name') || ''),
      requested_private_id: String(values.get('private_id') || ''),
      requested_class_period: String(values.get('class_period') || ''),
    })
    if (error || !data) {
      setMessage(es ? 'No hemos podido registrar tu entrada. Revisa los datos.' : 'We could not register your entry. Check your information.')
    } else {
      sessionStorage.setItem(`vocab-participant-${code}`, String(data))
      setMessage(es ? '¡Entrada confirmada! La sesión está preparada para comenzar.' : 'You are in! The session is ready to begin.')
    }
    setLoading(false)
  }

  return (
    <AccessLayout onBack={onBack} language={language} icon={<UsersRound size={30} />} title={es ? 'Entrar en una sesión' : 'Join a session'} subtitle={es ? 'Usa el enlace del profesor, escanea el QR o escribe el código.' : 'Use the teacher link, scan the QR, or enter the code.'}>
      {!sessionName ? (
        <form className="access-form" onSubmit={(event) => { event.preventDefault(); void validateSession() }}>
          <label>{es ? 'Código de la sesión' : 'Session code'}<input className="code-input" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={8} placeholder="AB7K2Q" autoCapitalize="characters" required /></label>
          <button className="primary-action" disabled={loading} type="submit"><KeyRound size={18} />{loading ? (es ? 'Buscando…' : 'Finding…') : (es ? 'Buscar sesión' : 'Find session')}</button>
          {message && <p className="form-message" role="status">{message}</p>}
        </form>
      ) : (
        <form className="access-form student-details" onSubmit={join}>
          <div className="session-confirmed"><School size={22} /><div><small>{es ? 'Sesión abierta' : 'Open session'}</small><strong>{sessionName}</strong></div></div>
          <div className="form-row"><label>{es ? 'Nombre' : 'First name'}<input name="first_name" autoComplete="given-name" required /></label><label>{es ? 'Apellido' : 'Last name'}<input name="last_name" autoComplete="family-name" required /></label></div>
          <label>{es ? 'ID privado del estudiante' : 'Private student ID'}<input name="private_id" type="password" inputMode="numeric" autoComplete="off" minLength={3} required /></label>
          <label>{es ? 'Clase' : 'Class'}<select name="class_period" required defaultValue=""><option value="" disabled>{es ? 'Selecciona tu clase' : 'Select your class'}</option>{classes.map((className) => <option key={className}>{className}</option>)}</select></label>
          <button className="primary-action" disabled={loading} type="submit">{loading ? (es ? 'Registrando…' : 'Joining…') : (es ? 'Entrar en el juego' : 'Enter the game')}<ArrowRight size={18} /></button>
          {message && <p className="form-message" role="status">{message}</p>}
        </form>
      )}
    </AccessLayout>
  )
}

function AccessLayout({ language, onBack, icon, title, subtitle, children }: AccessProps & { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="access-screen">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={18} />{language === 'es' ? 'Volver' : 'Back'}</button>
      <div className="access-card"><div className="access-heading-icon">{icon}</div><h1>{title}</h1><p>{subtitle}</p>{children}</div>
    </section>
  )
}
