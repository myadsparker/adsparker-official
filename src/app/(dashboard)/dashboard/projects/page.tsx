import ProjectTabs from './ProjectTabs';
import './projects.css';

export default function DashboardPage() {
  return (
    <main className='projects_screen'>
      <div className='ad-board-header'>
        <h1 className='ad-board-title'>
          Welcome to your <span className='highlight'>Ad Board!</span>
        </h1>
        <p className='ad-board-subtitle'>
          Stay organized with clear views of running, draft, and finished
          campaigns.
        </p>
      </div>
      <ProjectTabs />
    </main>
  );
}
