import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Brain,
  CircleHelp,
  GalleryHorizontal,
  Grid3X3,
  Headphones,
  Image as ImageIcon,
  Languages,
  Moon,
  Puzzle,
  Shapes,
  Sun,
  UserRound,
  UsersRound,
} from 'lucide-react'

type Language = 'es' | 'en'
type Theme = 'light' | 'dark'

const copy = {
  es: {
    eyebrow: 'CLASES DE BOLSILLO · NUEVA PLATAFORMA',
    title: 'Juegos de Vocabulario',
    subtitle: 'Una colección de juegos para convertir cada lección de español en una experiencia activa, visual y competitiva.',
    teacher: 'Soy profesor',
    teacherText: 'Crea lecciones, prepara actividades y abre sesiones para tu clase.',
    student: 'Soy estudiante',
    studentText: 'Entra con el enlace o código de tu sesión y comienza a jugar.',
    enter: 'Entrar',
    modulesEyebrow: 'UNA PLATAFORMA · MUCHAS FORMAS DE APRENDER',
    modulesTitle: 'Elige cómo practicar',
    modulesText: 'Cada lección podrá combinar distintos juegos con el mismo vocabulario.',
    available: 'Disponible en la primera versión',
    soon: 'Próximamente',
    footer: '2026 · Diseñado por Miguel Iglesias',
    preview: 'Vista previa del catálogo',
  },
  en: {
    eyebrow: 'POCKET CLASSROOMS · NEW PLATFORM',
    title: 'Vocabulary Games',
    subtitle: 'A collection of games that turns every Spanish lesson into an active, visual, and competitive experience.',
    teacher: 'I am a teacher',
    teacherText: 'Create lessons, prepare activities, and open sessions for your class.',
    student: 'I am a student',
    studentText: 'Join with your session link or code and start playing.',
    enter: 'Enter',
    modulesEyebrow: 'ONE PLATFORM · MANY WAYS TO LEARN',
    modulesTitle: 'Choose how to practice',
    modulesText: 'Each lesson can combine different games using the same vocabulary.',
    available: 'Available in the first release',
    soon: 'Coming soon',
    footer: '2026 · Designed by Miguel Iglesias',
    preview: 'Module catalog preview',
  },
}

const modules = [
  { key: 'matching', es: 'Emparejar español–inglés', en: 'Match Spanish–English', icon: GalleryHorizontal, tone: 'cyan', ready: true },
  { key: 'image', es: 'Imagen–palabra', en: 'Image–word', icon: ImageIcon, tone: 'emerald', ready: false },
  { key: 'memory', es: 'Memoria', en: 'Memory', icon: Brain, tone: 'violet', ready: true },
  { key: 'wordsearch', es: 'Sopa de letras', en: 'Word search', icon: Grid3X3, tone: 'amber', ready: false },
  { key: 'crossword', es: 'Crucigrama', en: 'Crossword', icon: Puzzle, tone: 'indigo', ready: false },
  { key: 'sentences', es: 'Completar frases', en: 'Complete sentences', icon: Languages, tone: 'coral', ready: false },
  { key: 'multiple', es: 'Opción múltiple', en: 'Multiple choice', icon: CircleHelp, tone: 'blue', ready: true },
  { key: 'listen', es: 'Escuchar y seleccionar', en: 'Listen and select', icon: Headphones, tone: 'pink', ready: false },
  { key: 'categories', es: 'Clasificar por categorías', en: 'Sort by category', icon: Shapes, tone: 'teal', ready: false },
]

export function App() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('vocab-language') as Language) || 'es')
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('vocab-theme') as Theme) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  const t = useMemo(() => copy[language], [language])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.lang = language
    localStorage.setItem('vocab-theme', theme)
    localStorage.setItem('vocab-language', language)
  }, [theme, language])

  return (
    <main className="site-shell">
      <nav className="topbar" aria-label={language === 'es' ? 'Controles de la aplicación' : 'Application controls'}>
        <div className="topbar-actions">
          <button className="utility-button" type="button" onClick={() => setLanguage(language === 'es' ? 'en' : 'es')} aria-label={language === 'es' ? 'Cambiar a inglés' : 'Switch to Spanish'}>
            <Languages size={18} /> {language === 'es' ? 'EN' : 'ES'}
          </button>
          <button className="icon-button" type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Turn on light mode'}>
            {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
          </button>
        </div>
      </nav>

      <section className="hero" id="top">
        <svg className="hero-decoration" viewBox="0 0 1200 610" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <circle className="corner-disc" cx="-70" cy="-60" r="310" />
          <circle className="corner-ring" cx="1110" cy="670" r="430" />
        </svg>
        <a className="hero-brand" href="#top" aria-label={t.title}>
          <img src={`${import.meta.env.BASE_URL}miguel-iglesias-logo.png`} alt="Miguel Iglesias" />
        </a>
        <div className="hero-copy">
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p className="hero-subtitle">{t.subtitle}</p>
          <div className="entry-grid">
            <article className="entry-card teacher-card">
              <span className="entry-icon"><UserRound size={26} /></span>
              <div><h2>{t.teacher}</h2><p>{t.teacherText}</p></div>
              <button type="button" className="entry-link">{t.enter}<ArrowRight size={17} /></button>
            </article>
            <article className="entry-card student-card">
              <span className="entry-icon"><UsersRound size={26} /></span>
              <div><h2>{t.student}</h2><p>{t.studentText}</p></div>
              <button type="button" className="entry-link">{t.enter}<ArrowRight size={17} /></button>
            </article>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true"></div>
      </section>

      <section className="modules-section" aria-labelledby="modules-heading">
        <header className="section-heading">
          <p className="eyebrow">{t.modulesEyebrow}</p>
          <h2 id="modules-heading">{t.modulesTitle}</h2>
          <p>{t.modulesText}</p>
        </header>
        <div className="module-grid">
          {modules.map((module) => {
            const Icon = module.icon
            return (
              <article className={`module-card tone-${module.tone}`} key={module.key}>
                <div className="module-icon"><Icon size={25} /></div>
                <h3>{module[language]}</h3>
                <span className={`status-pill ${module.ready ? 'ready' : ''}`}>{module.ready ? t.available : t.soon}</span>
              </article>
            )
          })}
        </div>
      </section>

      <footer><span className="copyleft" aria-label={language === 'es' ? 'Copyleft' : 'Copyleft'}>©</span> {t.footer}</footer>
    </main>
  )
}
