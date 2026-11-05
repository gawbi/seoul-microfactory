import { Footer } from './components/Footer'
import { Navbar } from './components/Navbar'
import { Evidence } from './sections/Evidence'
import { Film } from './sections/Film'
import { Hero } from './sections/Hero'
import { Intro } from './sections/Intro'
import { Process } from './sections/Process'
import { Report } from './sections/Report'
import { Roadmap } from './sections/Roadmap'

export default function App() {
  return (
    <>
      <a className="skip-link" href="#intro">
        본문으로 건너뛰기
      </a>
      <Navbar />
      <Hero />
      <main>
        <Intro />
        <Process />
        <Film />
        <Report />
        <Evidence />
        <Roadmap />
      </main>
      <Footer />
    </>
  )
}
