'use client';

import React, { useState, useEffect } from 'react';
import { Timeline } from 'antd';
import {
  BarChartOutlined,
  GlobalOutlined,
  MessageOutlined,
  AimOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import './AnalysisTimeline.css';

interface TimelineItem {
  key: string;
  title: string;
  description: string;
  status: 'completed' | 'active' | 'pending';
  icon: React.ReactNode;
}

interface AnalysisTimelineProps {
  isAnalyzing?: boolean;
  analysisDuration?: number; // in milliseconds
}

const AnalysisTimeline: React.FC<AnalysisTimelineProps> = ({
  isAnalyzing = false,
  analysisDuration = 10000, // default 10 seconds
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const timelineItems: TimelineItem[] = [
    {
      key: 'analyzing',
      title: 'Analyzing your business',
      description: 'Extracting business information from your website.',
      status:
        currentStep > 0
          ? 'completed'
          : currentStep === 0
            ? 'active'
            : 'pending',
      icon: <BarChartOutlined />,
    },
    {
      key: 'parsing',
      title: 'Parsing URL',
      description: 'Analyzing website structure and content.',
      status:
        currentStep > 1
          ? 'completed'
          : currentStep === 1
            ? 'active'
            : 'pending',
      icon: <GlobalOutlined />,
    },
    {
      key: 'identifying',
      title: 'Identifying product information',
      description: 'Extracting key products and services.',
      status:
        currentStep > 2
          ? 'completed'
          : currentStep === 2
            ? 'active'
            : 'pending',
      icon: <MessageOutlined />,
    },
    {
      key: 'analyzing-points',
      title: 'Analyzing selling points',
      description: 'Identifying unique value propositions.',
      status:
        currentStep > 3
          ? 'completed'
          : currentStep === 3
            ? 'active'
            : 'pending',
      icon: <AimOutlined />,
    },
    {
      key: 'competitor-analysis',
      title: 'Generating campaign proposal',
      description: 'Creating business summary and campaign strategy.',
      status:
        currentStep > 4
          ? 'completed'
          : currentStep === 4
            ? 'active'
            : 'pending',
      icon: <AimOutlined />,
    },
  ];

  useEffect(() => {
    if (!isAnalyzing) {
      setCurrentStep(0);
      setIsComplete(false);
      return;
    }

    // Calculate step duration based on total analysis duration
    const stepDuration = analysisDuration / 5; // 5 steps total
    let stepIndex = 0;

    const stepInterval = setInterval(() => {
      setCurrentStep(stepIndex);
      stepIndex++;

      if (stepIndex >= 5) {
        setIsComplete(true);
        clearInterval(stepInterval);
      }
    }, stepDuration);

    return () => clearInterval(stepInterval);
  }, [isAnalyzing, analysisDuration]);

  return (
    <div className='analysis-timeline-container'>
      <Timeline
        className='analysis-timeline'
        items={timelineItems.map(item => ({
          dot: (
            <div className={`timeline-dot timeline-dot-${item.status}`}>
              {item.status === 'completed' ? (
                <CheckOutlined className='check-icon' />
              ) : (
                <div className={`timeline-icon timeline-icon-${item.status}`}>
                  {item.icon}
                </div>
              )}
            </div>
          ),
          children: (
            <div className={`timeline-content timeline-content-${item.status}`}>
              <div className='timeline-content-inner'>
                <div
                  className={`timeline-icon-container timeline-icon-container-${item.status}`}
                >
                  {item.icon}
                </div>
                <div className='timeline-text'>
                  <div className='timeline-title'>{item.title}</div>
                  <div className='timeline-description'>{item.description}</div>
                </div>
              </div>
            </div>
          ),
        }))}
      />
    </div>
  );
};

export default AnalysisTimeline;
