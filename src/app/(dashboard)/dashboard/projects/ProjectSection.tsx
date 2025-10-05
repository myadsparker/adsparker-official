'use client';

import ProjectCard from '@/components/dashboard/ProjectCard';
import { motion } from 'framer-motion';

export default function ProjectSection({
  title,
  projects,
}: {
  title: string;
  projects: any[];
}) {
  return (
    <div className='mb-8'>
      <h3 className='font-semibold text-md text-gray-700 mb-2'>{title}</h3>
      <motion.div
        className='flex overflow-x-auto space-x-4 scrollbar-hide'
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {projects.map(proj => (
          <ProjectCard key={proj.id} project={proj} />
        ))}
      </motion.div>
    </div>
  );
}
