'use client';

import { Tabs } from 'antd';
import { useEffect, useState } from 'react';
import ProjectSection from './ProjectSection';
import { supabase } from '@/lib/supabase';

const tabItems = [
  { label: 'Running', key: 'running' },
  { label: 'Draft', key: 'draft' },
  { label: 'Finished', key: 'finished' },
];

export default function ProjectTabs() {
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase.from('projects').select('*');
      setProjects(data || []);
    };
    fetchProjects();
  }, []);

  const grouped = {
    running: projects.filter(p => p.status === 'running'),
    draft: projects.filter(p => p.status === 'draft'),
    finished: projects.filter(p => p.status === 'finished'),
  };

  return (
    <Tabs
      defaultActiveKey='running'
      centered
      items={tabItems.map(tab => ({
        key: tab.key,
        label: tab.label,
        children: (
          <>
            {tab.key !== 'all' && (
              <ProjectSection
                title={tab.label}
                projects={grouped[tab.key as keyof typeof grouped]}
              />
            )}
          </>
        ),
      }))}
    />
  );
}
