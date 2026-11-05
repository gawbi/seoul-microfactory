import { Footer } from './components/Footer'
import { Navbar } from './components/Navbar'
import { DigitalTwin } from './sections/DigitalTwin'
import { Hero } from './sections/Hero'
import { Problem } from './sections/Problem'
import { Report } from './sections/Report'
import { RobotValidation } from './sections/RobotValidation'
import { Roadmap } from './sections/Roadmap'
import { Solution } from './sections/Solution'
import { TechStack } from './sections/TechStack'
import { Vision } from './sections/Vision'
import { Workflow } from './sections/Workflow'

export default function App() {
  return (
    <>
      <a className="skip-link" href="#problem">
        본문으로 건너뛰기
      </a>
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <Workflow />
        <DigitalTwin />
        <Report />
        <RobotValidation />
        <TechStack />
        <Roadmap />
        <Vision />
      </main>
      <Footer />
    </>
  )
}
