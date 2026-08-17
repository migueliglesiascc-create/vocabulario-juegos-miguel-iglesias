import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, File, FileUp, KeyRound, LayoutGrid, LogOut, Mail, Plus, QrCode, Radio, School, ShieldCheck, Trash2, UsersRound, X } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type Language = 'es' | 'en'

type AccessProps = {
  language: Language
  onBack: () => void
}

type Lesson = { id: string; title: string; description: string | null; created_at: string }
type SourceFile = { id: string; original_name: string; mime_type: string | null; size_bytes: number; status: string; created_at: string }

const classes = [
  'Período 0 - Spanish 1/2',
  'Período 1 - AP Spanish',
  'Período 2 - Spanish 1/2',
  'Período 3 - Spanish 1/2',
  'Período 4 - Spanish 1/2',
]

export function TeacherAccess({ language, onBack }: AccessProps) {
  const es = language === 'es'
  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('migueliglesias.cc@gmail.com')
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    void supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user.id || ''
      setUserId(id)
      if (id) void loadLessons(id)
      else setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id || ''
      setUserId(id)
      if (id) void loadLessons(id)
      else {
        setLessons([])
        setLoading(false)
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadLessons(id = userId) {
    if (!supabase || !id) return
    setLoading(true)
    const { data, error } = await supabase.from('lessons').select('id,title,description,created_at').eq('teacher_id', id).order('created_at', { ascending: false })
    setLessons(data || [])
    if (error) setMessage(es ? 'No se pudieron cargar las lecciones.' : 'Lessons could not be loaded.')
    setLoading(false)
  }

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.href } })
    setMessage(error
      ? (es ? 'No se pudo enviar el enlace. Revisa el correo y la configuración de Supabase.' : 'The access link could not be sent. Check the email and Supabase settings.')
      : (es ? 'Enlace enviado. Abre el correo y pulsa el botón para entrar; no necesitas contraseña.' : 'Access link sent. Open the email and use the button to sign in; no password is needed.'))
    setLoading(false)
  }

  async function createLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !userId) return
    const values = new FormData(event.currentTarget)
    setLoading(true)
    setMessage('')
    const { error } = await supabase.from('lessons').insert({
      teacher_id: userId,
      title: String(values.get('title') || '').trim(),
      description: String(values.get('description') || '').trim() || null,
    })
    if (error) setMessage(es ? 'No se pudo crear la lección.' : 'The lesson could not be created.')
    else {
      event.currentTarget.reset()
      setShowCreate(false)
      setMessage(es ? 'Lección creada correctamente.' : 'Lesson created successfully.')
      await loadLessons(userId)
    }
    setLoading(false)
  }

  async function openLesson(lesson: Lesson) {
    setActiveLesson(lesson)
    setSelectedFiles([])
    setMessage('')
    if (!supabase) return
    const { data, error } = await supabase.from('lesson_source_files').select('id,original_name,mime_type,size_bytes,status,created_at').eq('lesson_id', lesson.id).order('created_at', { ascending: false })
    setSourceFiles(data || [])
    if (error) setMessage(es ? 'Aplica la nueva migración de Supabase para activar los materiales de la lección.' : 'Apply the new Supabase migration to enable lesson materials.')
  }

  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files || [])
    setSelectedFiles((current) => [...current, ...incoming].filter((file, index, all) => all.findIndex((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified) === index))
    event.target.value = ''
  }

  async function uploadFiles() {
    if (!supabase || !userId || !activeLesson || selectedFiles.length === 0) return
    setLoading(true)
    setMessage('')
    let uploaded = 0
    for (const file of selectedFiles) {
      const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-')
      const storagePath = `${userId}/${activeLesson.id}/${crypto.randomUUID()}-${safeName}`
      const { error: storageError } = await supabase.storage.from('lesson-sources').upload(storagePath, file, { contentType: file.type || undefined, upsert: false })
      if (storageError) continue
      const { error: metadataError } = await supabase.from('lesson_source_files').insert({ lesson_id: activeLesson.id, teacher_id: userId, storage_path: storagePath, original_name: file.name, mime_type: file.type || null, size_bytes: file.size })
      if (metadataError) await supabase.storage.from('lesson-sources').remove([storagePath])
      else uploaded += 1
    }
    const uploadMessage = uploaded === selectedFiles.length
      ? (es ? `${uploaded} archivo${uploaded === 1 ? '' : 's'} subido${uploaded === 1 ? '' : 's'} correctamente.` : `${uploaded} file${uploaded === 1 ? '' : 's'} uploaded successfully.`)
      : (es ? `Se subieron ${uploaded} de ${selectedFiles.length}. Comprueba que la migración esté aplicada.` : `${uploaded} of ${selectedFiles.length} uploaded. Check that the migration has been applied.`)
    setSelectedFiles([])
    await openLesson(activeLesson)
    setMessage(uploadMessage)
    setLoading(false)
  }

  async function deleteSource(source: SourceFile) {
    if (!supabase || !activeLesson) return
    const { data } = await supabase.from('lesson_source_files').select('storage_path').eq('id', source.id).single()
    if (data?.storage_path) await supabase.storage.from('lesson-sources').remove([data.storage_path])
    await supabase.from('lesson_source_files').delete().eq('id', source.id)
    await openLesson(activeLesson)
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  async function signOut() {
    await supabase?.auth.signOut()
    setMessage('')
  }

  return (
    <AccessLayout onBack={onBack} language={language} icon={<ShieldCheck size={30} />} title={es ? 'Panel del profesor' : 'Teacher dashboard'} subtitle={userId ? (es ? 'Gestiona tus lecciones y prepara las próximas sesiones.' : 'Manage lessons and prepare upcoming sessions.') : (es ? 'Accede de forma segura mediante un enlace enviado a tu correo.' : 'Sign in securely with a link sent to your email.')}>
      {!isSupabaseConfigured ? (
        <p className="setup-note">{es ? 'Falta conectar este entorno con la URL y la clave pública de Supabase.' : 'This environment still needs the Supabase URL and publishable key.'}</p>
      ) : loading && !userId ? (
        <p className="setup-note">{es ? 'Comprobando acceso…' : 'Checking access…'}</p>
      ) : !userId ? (
        <form className="access-form" onSubmit={sendMagicLink}>
          <label>{es ? 'Correo del profesor' : 'Teacher email'}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
          <button className="primary-action" disabled={loading} type="submit"><Mail size={18} />{loading ? (es ? 'Enviando…' : 'Sending…') : (es ? 'Enviarme enlace de acceso' : 'Send me an access link')}</button>
          <p className="setup-note">{es ? 'Sin contraseña: solo el propietario de este correo podrá abrir el panel.' : 'No password: only the owner of this email can open the dashboard.'}</p>
          {message && <p className="form-message" role="status">{message}</p>}
        </form>
      ) : (
        <div className="teacher-workspace">
          {activeLesson ? <>
            <div className="lesson-editor-heading"><button className="secondary-action" type="button" onClick={() => { setActiveLesson(null); setMessage('') }}><ArrowLeft size={17} />{es ? 'Mis lecciones' : 'My lessons'}</button><div><small>{es ? 'Editando lección' : 'Editing lesson'}</small><h2>{activeLesson.title}</h2></div></div>
            <section className="source-uploader">
              <div className="source-uploader-heading"><FileUp size={25} /><div><h3>{es ? 'Materiales de origen' : 'Source materials'}</h3><p>{es ? 'Selecciona varios archivos a la vez: imágenes, PDF, presentaciones, documentos, hojas de cálculo, CSV, JSON o texto.' : 'Select several files at once: images, PDFs, presentations, documents, spreadsheets, CSV, JSON, or text.'}</p></div></div>
              <label className="file-picker"><FileUp size={20} /><span>{es ? 'Elegir varios archivos' : 'Choose multiple files'}</span><input type="file" multiple onChange={chooseFiles} accept="image/*,.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv,.json,.txt,application/pdf" /></label>
              {selectedFiles.length > 0 && <div className="pending-files"><div className="pending-files-title"><strong>{es ? 'Preparados para subir' : 'Ready to upload'}</strong><span>{selectedFiles.length}</span></div>{selectedFiles.map((file) => <div className="source-file-row" key={`${file.name}-${file.size}-${file.lastModified}`}><File size={18} /><div><strong>{file.name}</strong><span>{formatSize(file.size)}</span></div><button type="button" onClick={() => setSelectedFiles((current) => current.filter((item) => item !== file))} aria-label={es ? `Quitar ${file.name}` : `Remove ${file.name}`}><X size={17} /></button></div>)}<button className="primary-action" type="button" disabled={loading} onClick={() => void uploadFiles()}><FileUp size={18} />{loading ? (es ? 'Subiendo…' : 'Uploading…') : (es ? `Subir ${selectedFiles.length} archivo${selectedFiles.length === 1 ? '' : 's'}` : `Upload ${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'}`)}</button></div>}
            </section>
            <section className="stored-files"><div className="lesson-list-heading"><h2>{es ? 'Archivos guardados' : 'Saved files'}</h2><span>{sourceFiles.length}</span></div>{sourceFiles.length === 0 ? <p className="empty-state">{es ? 'Todavía no hay materiales. Puedes subir varios en una sola selección.' : 'No materials yet. You can upload several in one selection.'}</p> : sourceFiles.map((source) => <div className="source-file-row" key={source.id}><File size={18} /><div><strong>{source.original_name}</strong><span>{formatSize(source.size_bytes)} · {source.status}</span></div><button type="button" onClick={() => void deleteSource(source)} aria-label={es ? `Eliminar ${source.original_name}` : `Delete ${source.original_name}`}><Trash2 size={17} /></button></div>)}</section>
            {message && <p className="form-message" role="status">{message}</p>}
          </> : <>
          <div className="teacher-toolbar">
            <button className="primary-action compact-action" type="button" onClick={() => setShowCreate((value) => !value)}><Plus size={18} />{es ? 'Nueva lección' : 'New lesson'}</button>
            <button className="secondary-action" type="button" onClick={signOut}><LogOut size={17} />{es ? 'Salir' : 'Sign out'}</button>
          </div>
          {showCreate && <form className="access-form create-lesson-form" onSubmit={createLesson}>
            <label>{es ? 'Título de la lección' : 'Lesson title'}<input name="title" placeholder={es ? 'Ej.: Lección 1 · Contextos' : 'E.g. Lesson 1 · Contexts'} required /></label>
            <label>{es ? 'Descripción (opcional)' : 'Description (optional)'}<textarea name="description" rows={3} /></label>
            <button className="primary-action" disabled={loading} type="submit"><BookOpen size={18} />{es ? 'Crear lección' : 'Create lesson'}</button>
          </form>}
          <div className="teacher-dashboard-grid">
            <article><BookOpen size={24} /><div><strong>{lessons.length} {es ? 'lecciones' : 'lessons'}</strong><span>{es ? 'Contenido de vocabulario reutilizable' : 'Reusable vocabulary content'}</span></div></article>
            <article><LayoutGrid size={24} /><div><strong>{es ? 'Módulos' : 'Modules'}</strong><span>{es ? 'El profesor elegirá los juegos' : 'The teacher will choose the games'}</span></div></article>
            <article><Radio size={24} /><div><strong>{es ? 'Sesiones' : 'Sessions'}</strong><span>{es ? 'Competición justa con la misma actividad' : 'Fair competition with the same activity'}</span></div></article>
            <article><QrCode size={24} /><div><strong>{es ? 'Enlace y QR' : 'Link and QR'}</strong><span>{es ? 'Acceso directo para los estudiantes' : 'Direct student access'}</span></div></article>
          </div>
          <section className="lesson-list" aria-label={es ? 'Lecciones' : 'Lessons'}>
            <div className="lesson-list-heading"><h2>{es ? 'Mis lecciones' : 'My lessons'}</h2><span>{loading ? '…' : lessons.length}</span></div>
            {!loading && lessons.length === 0 ? <p className="empty-state">{es ? 'Crea tu primera lección para empezar a añadir vocabulario.' : 'Create your first lesson to start adding vocabulary.'}</p> : lessons.map((lesson) => <button type="button" className="lesson-row" key={lesson.id} onClick={() => void openLesson(lesson)}><BookOpen size={20} /><div><strong>{lesson.title}</strong><span>{lesson.description || (es ? 'Sin descripción' : 'No description')}</span></div><ArrowRight size={18} /></button>)}
          </section>
          {message && <p className="form-message" role="status">{message}</p>}
          </>}
        </div>
      )}
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
