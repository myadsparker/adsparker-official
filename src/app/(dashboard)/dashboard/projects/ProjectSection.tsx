'use client';

import ProjectCard from '@/components/dashboard/ProjectCard';
import { motion } from 'framer-motion';

export default function ProjectSection({
  title,
  projects,
  visibleCount,
  onLoadMore,
  onCollapse,
}: {
  title: string;
  projects: any[];
  visibleCount: number;
  onLoadMore: () => void;
  onCollapse: () => void;
}) {
  const visibleProjects = projects.slice(0, visibleCount);
  const hasMore = projects.length > visibleCount;
  const showCollapse = visibleCount >= projects.length;

  return (
    <div className='project-section'>
      {projects.length === 0 ? (
        <div className='text-center py-8 text-gray-500'>
          <p>No {title.toLowerCase()} projects found</p>
        </div>
      ) : (
        <>
          <motion.div
            className='projects-grid'
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {visibleProjects.map(proj => (
              <ProjectCard key={proj.id} project={proj} />
            ))}
          </motion.div>

          {projects.length > 6 && (
            <div className='load-more-container'>
              <button
                className='load-more-button'
                onClick={showCollapse ? onCollapse : onLoadMore}
              >
                {showCollapse
                  ? 'Collapse'
                  : `Load More (${projects.length - visibleCount} remaining)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
