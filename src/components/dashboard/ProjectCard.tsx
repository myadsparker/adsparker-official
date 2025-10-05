'use client';

import { Card, Tag } from 'antd';

export default function ProjectCard({ project }: { project: any }) {
  return (
    <Card className='w-60 h-36 m-2 rounded-xl shadow-md bg-white'>
      <Tag color='purple' className='mb-2 uppercase'>
        {project.status}
      </Tag>
      <div className='font-semibold text-sm text-gray-500'>
        {project.campaign_proposal.ad_goal} -
      </div>
      <div className='font-bold text-black truncate'>
        {project.campaign_proposal.project_name || '-'}
      </div>
    </Card>
  );
}
