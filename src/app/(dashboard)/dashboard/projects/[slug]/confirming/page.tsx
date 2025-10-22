'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Stepper from '@/components/dashboard/Stepper';
import CampaignDetails from './CampaignDetails';
import './style.css';

export default function Confirming() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.slug as string;
  const [projectData, setProjectData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<any>(null);
  const [isFormValid, setIsFormValid] = useState(false);
  const [businessName, setBusinessName] = useState<string>('');

  const handleFormDataChange = useCallback((data: any) => {
    setFormData(data.formData);
    setIsFormValid(data.isValid);
  }, []);

  const handleNext = async () => {
    if (!isFormValid) {
      // Scroll to first error field instead of showing alert
      const firstErrorField = document.querySelector('.has-error');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // If no error field found, show a general message
        alert('Please fill in all required fields before proceeding.');
      }
      return;
    }

    // Save form data to database before navigation
    try {
      const response = await fetch('/api/save-campaign-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          startDate: formData?.startDate,
          endDate: formData?.endDate,
          selectedGoal: formData?.selectedGoal,
          selectedCta: formData?.selectedCta,
        }),
      });

      if (response.ok) {
        // Navigate to next page after successful save
        router.push(`/dashboard/projects/${projectId}/plan`);
      } else {
        console.error('Failed to save campaign details');
        alert('Failed to save campaign details. Please try again.');
      }
    } catch (error) {
      console.error('Error saving campaign details:', error);
      alert('Error saving campaign details. Please try again.');
    }
  };

  const handlePrev = () => {
    router.push(`/dashboard/projects/${projectId}/analyze`);
  };

  // Fetch project data and trigger API calls
  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        const supabase = createClientComponentClient();

        const { data: project, error } = await supabase
          .from('projects')
          .select('*')
          .eq('project_id', projectId)
          .single();

        if (error) {
          console.error('Error fetching project:', error);
          return;
        }

        setProjectData(project);

        // Check if business name is already available in project data
        if (project.analysing_points?.businessName) {
          setBusinessName(project.analysing_points.businessName);
          console.log(
            '✅ Business name found in project data:',
            project.analysing_points.businessName
          );
        }

        // No API calls needed here - all APIs are now called from their respective pages
        console.log(
          '✅ Confirming page loaded - all APIs handled by other pages'
        );

        // Extract business name from existing project data (analyzing points should already be completed)
        if (project.analysing_points?.businessName) {
          setBusinessName(project.analysing_points.businessName);
          console.log(
            '✅ Business name found in project data:',
            project.analysing_points.businessName
          );
        }

        // Refresh project data to get the updated campaign_proposal data
        console.log('🔄 Refreshing project data to show new results...');
        const { data: updatedProject, error: refreshError } = await supabase
          .from('projects')
          .select('*')
          .eq('project_id', projectId)
          .single();

        if (refreshError) {
          console.error('❌ Error refreshing project data:', refreshError);
        } else {
          setProjectData(updatedProject);
          console.log('✅ Project data refreshed successfully!');
        }
      } catch (err) {
        console.error('Failed to load project:', err);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  return (
    <div>
      <Stepper currentStepKey='step3' />
      <div className='mt-8'>
        <CampaignDetails
          projectData={projectData}
          loading={loading}
          campaignName={
            businessName || projectData?.campaign_proposal?.campaignName
          }
          onFormDataChange={handleFormDataChange}
        />
      </div>
      <div className='nav_buttons_wrapper'>
        <button onClick={handlePrev}>
          <svg
            width='20'
            height='20'
            viewBox='0 0 20 20'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              d='M5 6.6665L1.66667 9.99984L5 13.3332'
              stroke='#7E52E0'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <path
              d='M18.333 10H1.66634'
              stroke='#7E52E0'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
          Back
        </button>
        <button
          className={`next ${!isFormValid ? 'disabled' : ''}`}
          onClick={handleNext}
        >
          Next
          <svg
            width='20'
            height='20'
            viewBox='0 0 20 20'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              d='M15 6.6665L18.3333 9.99984L15 13.3332'
              stroke='white'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <path
              d='M1.66699 10H18.3337'
              stroke='white'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
