'use client';

import { useRouter } from 'next/navigation';

export default function ProjectCard({ project }: { project: any }) {
  const router = useRouter();

  const getStatusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'DRAFT';
      case 'DRAFT':
        return 'DRAFT';
      case 'RUNNING':
        return 'RUNNING';
      case 'ACTIVE':
        return 'ACTIVE';
      case 'FINISHED':
        return 'FINISHED';
      case 'COMPLETED':
        return 'COMPLETED';
      case 'FAILED':
        return 'FAILED';
      default:
        return 'DRAFT';
    }
  };

  const getProjectTitle = () => {
    return (
      project.campaign_proposal?.project_name ||
      project.url_analysis?.website_url ||
      'Untitled Project'
    );
  };

  const getProjectDescription = () => {
    return (
      project.campaign_proposal?.description ||
      project.url_analysis?.description ||
      "By understanding these competitors' strengths, TCS can tailor its advertising strategies to highlight its unique offerings in cloud services, cognitive business operations, and digital transformation solutions..."
    );
  };

  const isRunning = project.status === 'RUNNING' || project.status === 'ACTIVE';
  const projectId = project.project_id || project.id;

  const handleCardClick = () => {
    if (isRunning) {
      router.push(`/dashboard/projects/${projectId}/dashboard`);
    } else {
      router.push(`/dashboard/projects/${projectId}/plan`);
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRunning) {
      router.push(`/dashboard/projects/${projectId}/dashboard`);
    } else {
      router.push(`/dashboard/projects/${projectId}/plan`);
    }
  };

  return (
    <div
      className='project-card'
      onClick={handleCardClick}
      style={{ cursor: 'pointer' }}
    >
      <div className='project-card-header'>
        <div className='project-status'>
          <div className='status-dot'></div>
          <span className='status-text'>{getStatusLabel(project.status)}</span>
        </div>
        <div className='project-menu'>
          <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
            <path
              d='M8 8.5C8.27614 8.5 8.5 8.27614 8.5 8C8.5 7.72386 8.27614 7.5 8 7.5C7.72386 7.5 7.5 7.72386 7.5 8C7.5 8.27614 7.72386 8.5 8 8.5Z'
              fill='#6B7280'
            />
            <path
              d='M8 4.5C8.27614 4.5 8.5 4.27614 8.5 4C8.5 3.72386 8.27614 3.5 8 3.5C7.72386 3.5 7.5 3.72386 7.5 4C7.5 4.27614 7.72386 4.5 8 4.5Z'
              fill='#6B7280'
            />
            <path
              d='M8 12.5C8.27614 12.5 8.5 12.2761 8.5 12C8.5 11.7239 8.27614 11.5 8 11.5C7.72386 11.5 7.5 11.7239 7.5 12C7.5 12.2761 7.72386 12.5 8 12.5Z'
              fill='#6B7280'
            />
          </svg>
        </div>
      </div>

      <div className='project-content'>
        <h3 className='project-title'>{getProjectTitle()}</h3>
        <p className='project-description'>{getProjectDescription()}</p>
      </div>

      <div className='project-actions'>
        <button
          className='edit-button'
          onClick={handleButtonClick}
        >
          {isRunning ? 'View Dashboard' : 'Edit Campaign'}
        </button>
      </div>
    </div>
  );
}
