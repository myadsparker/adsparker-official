'use client';

import { Tabs } from 'antd';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ProjectSection from './ProjectSection';

const tabItems = [
  { label: 'Draft', key: 'draft' },
  { label: 'Running', key: 'running' },
  { label: 'Finished', key: 'finished' },
];

export default function ProjectTabs() {
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(6);
  const [activeTab, setActiveTab] = useState<string>('draft');

  useEffect(() => {
    // Get active tab from URL query parameter
    const tabParam = searchParams.get('tab');
    if (tabParam && ['draft', 'running', 'finished'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/projects');
        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }
        const data = await response.json();
        console.log('Fetched projects:', data.projects);
        setProjects(data.projects || []);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const grouped = {
    running: projects.filter(
      p => p.status === 'RUNNING' || p.status === 'ACTIVE'
    ),
    draft: projects.filter(
      p =>
        p.status === 'PENDING' ||
        p.status === 'DRAFT' ||
        p.status === 'draft' ||
        !p.status
    ),
    finished: projects.filter(
      p =>
        p.status === 'FINISHED' ||
        p.status === 'COMPLETED' ||
        p.status === 'finished'
    ),
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 6);
  };

  const handleCollapse = () => {
    setVisibleCount(6);
  };

  console.log('Grouped projects:', grouped);

  if (loading) {
    return (
      <div className='flex justify-center items-center h-64'>
        <div className='text-gray-500'>Loading projects...</div>
      </div>
    );
  }

  return (
    <Tabs
      activeKey={activeTab}
      onChange={setActiveTab}
      centered
      items={tabItems.map(tab => {
        const projectCount = grouped[tab.key as keyof typeof grouped].length;
        return {
          key: tab.key,
          label: `${tab.label} (${projectCount})`,
          children: (
            <>
              {tab.key !== 'all' && (
                <ProjectSection
                  title={tab.label}
                  projects={grouped[tab.key as keyof typeof grouped]}
                  visibleCount={visibleCount}
                  onLoadMore={handleLoadMore}
                  onCollapse={handleCollapse}
                />
              )}
            </>
          ),
        };
      })}
    />
  );
}
