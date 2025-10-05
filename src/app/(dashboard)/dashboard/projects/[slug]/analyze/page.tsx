'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import './analyze.css';
import Stepper from '@/components/dashboard/Stepper';
import AnalysisTimeline from '@/components/dashboard/AnalysisTimeline';
import { gsap } from 'gsap';

// Simple Dot Loading Animation Component
const SimpleDotLoading = ({ text = 'Analyzing your website...' }) => {
  return (
    <div className='gsap_loading_container'>
      <div className='loading_dots'>
        <div className='loading_dot'></div>
        <div className='loading_dot'></div>
        <div className='loading_dot'></div>
      </div>
      <div className='loading_text'>{text}</div>
    </div>
  );
};

// GSAP Text Reveal Component
const GSAPTextReveal = ({
  text,
  className = '',
  onComplete,
  animateKey,
}: {
  text: string;
  className?: string;
  onComplete?: () => void;
  animateKey: string;
}) => {
  const textRef = useRef<HTMLParagraphElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    // Only run GSAP animations on client side
    if (typeof window === 'undefined') return;

    if (textRef.current && text && !hasAnimated.current) {
      hasAnimated.current = true;

      // Split text into characters (text is already processed)
      const chars = text.split('');
      const html = chars
        .map(
          char => `<span class="char">${char === ' ' ? '&nbsp;' : char}</span>`
        )
        .join('');
      textRef.current.innerHTML = html;

      // Set initial state
      gsap.set(textRef.current.querySelectorAll('.char'), {
        opacity: 0,
        y: 20,
        rotationX: 90,
      });

      // Animate characters
      gsap.to(textRef.current.querySelectorAll('.char'), {
        opacity: 1,
        y: 0,
        rotationX: 0,
        duration: 0.05,
        stagger: 0.02,
        ease: 'power2.out',
        onComplete: onComplete,
      });
    }
  }, [text, onComplete, animateKey]);

  return <p ref={textRef} className={className}></p>;
};

const URLAnalyzerInterface = () => {
  const params = useParams();
  const router = useRouter();
  const projectId = params.slug as string;

  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectData, setProjectData] = useState<any>(null);
  const [url, setUrl] = useState('');
  const [analysisStartTime, setAnalysisStartTime] = useState<number | null>(
    null
  );
  const [analysisDuration, setAnalysisDuration] = useState<number>(10000); // default 10 seconds
  const [isClient, setIsClient] = useState(false);
  const [analysisSuccess, setAnalysisSuccess] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [analyzingPoints, setAnalyzingPoints] = useState<any>(null);
  const [showBox1, setShowBox1] = useState(false);
  const [showBox2, setShowBox2] = useState(false);
  const [showBox3, setShowBox3] = useState(false);
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [allAnimationsComplete, setAllAnimationsComplete] = useState(false);
  const rightContainerRef = useRef<HTMLDivElement>(null);

  // Fetch project data + trigger analysis
  const fetchProjectData = async () => {
    try {
      setInitialLoading(true);
      const supabase = createClientComponentClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        setInitialLoading(false);
        return;
      }

      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', session.user.id)
        .single();

      if (error) {
        setError('Failed to fetch project data');
        setInitialLoading(false);
        return;
      }

      setProjectData(project);
      const projectUrl = project.url_analysis?.website_url;
      setUrl(projectUrl);

      // Check if persona analysis was already completed
      if (
        project.url_analysis?.personas?.personaNames &&
        project.url_analysis?.personas?.personaNames.length > 0
      ) {
        // Persona analysis exists, navigate directly to confirming page

        router.push(`/dashboard/projects/${projectId}/confirming`);
        return;
      } else {
        // No persona analysis found, start the persona creation process
        setInitialLoading(false);
        await analyzeURL(projectId);
      }
    } catch (err) {
      setError('Failed to load project');
      setInitialLoading(false);
    }
  };

  const analyzeURL = async (projectId: string) => {
    try {
      setLoading(true);
      setError(null);
      setAnalysisSuccess(false);
      setAnalyzingPoints(null);
      setShowBox1(false);
      setShowBox2(false);
      setShowBox3(false);
      setShowScreenshot(false);
      setAllAnimationsComplete(false);
      const startTime = Date.now();
      setAnalysisStartTime(startTime);

      // Step 1: Call analyzing-points API first
      const analyzingPointsResponse = await fetch('/api/analyzing-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (!analyzingPointsResponse.ok) {
        throw new Error(
          `Analyzing Points API failed with status: ${analyzingPointsResponse.status}`
        );
      }

      const analyzingPointsResult = await analyzingPointsResponse.json();
      if (!analyzingPointsResult.success) {
        throw new Error('Analyzing Points API returned unsuccessful result');
      }

      // Show UI immediately when analyzing points finishes
      setAnalyzingPoints(analyzingPointsResult.analysing_points);
      setAnalysisSuccess(true);
      const actualDuration = Date.now() - startTime;
      setAnalysisDuration(actualDuration);

      // Step 2: Call analyze-snapshot API after analyzing-points completes

      const analyzeSnapshotResponse = await fetch('/api/analyze-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      });

      if (!analyzeSnapshotResponse.ok) {
        // Don't throw error here - UI can still work with analyzing points data
      } else {
        const analyzeSnapshotResult = await analyzeSnapshotResponse.json();
        if (analyzeSnapshotResult.success) {
        } else {
        }
      }
    } catch (err: any) {
      setError(err.message);
      setAnalysisSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  // Data is saved by the respective API endpoints (analyzing-points and analyze-snapshot)

  // Set client-side flag to prevent hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (projectId && isClient) fetchProjectData();
  }, [projectId, isClient]);

  // Trigger sequential reveals when analyzing points data is loaded
  useEffect(() => {
    if (analyzingPoints) {
      // Start with screenshot after a short delay
      setTimeout(() => {
        setShowScreenshot(true);
      }, 500);
    }
  }, [analyzingPoints]);

  // Auto-navigate to confirming page after all animations complete
  useEffect(() => {
    if (allAnimationsComplete) {
      const navigationTimer = setTimeout(() => {
        router.push(`/dashboard/projects/${projectId}/confirming`);
      }, 2000); // 2 seconds after all animations complete

      // Cleanup timer if component unmounts
      return () => clearTimeout(navigationTimer);
    }
  }, [allAnimationsComplete, projectId, router]);

  // Auto-scroll function - only run on client
  const scrollToElement = (element: HTMLElement) => {
    if (typeof window === 'undefined' || !rightContainerRef.current) return;

    const container = rightContainerRef.current;
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const scrollTop =
      container.scrollTop + elementRect.top - containerRect.top - 20;

    container.scrollTo({
      top: scrollTop,
      behavior: 'smooth',
    });
  };

  // Handle screenshot completion
  const handleScreenshotComplete = () => {
    setTimeout(() => {
      setShowBox1(true);
    }, 300);
  };

  // Handle box completion callbacks with scrolling
  const handleBox1Complete = () => {
    setTimeout(() => {
      setShowBox2(true);
      // Scroll to box 2 after it appears - only on client
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          const box2 = document.querySelector('[data-box="2"]');
          if (box2) scrollToElement(box2 as HTMLElement);
        }, 100);
      }
    }, 200);
  };

  const handleBox2Complete = () => {
    setTimeout(() => {
      setShowBox3(true);
      // Scroll to box 3 after it appears - only on client
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          const box3 = document.querySelector('[data-box="3"]');
          if (box3) scrollToElement(box3 as HTMLElement);
        }, 100);
      }
    }, 200);
  };

  const handleBox3Complete = () => {
    // All animations are complete when box 3 finishes
    setTimeout(() => {
      setAllAnimationsComplete(true);
    }, 1000); // Give a bit more time for the final animation to complete
  };

  // Show loading state during hydration
  if (!isClient) {
    return (
      <div className='analyze_screen'>
        <Stepper currentStepKey='step2' />
        <div className='analyze_container'>
          <div className='analyze_container_left'>
            <h2>Set Up Your Ad Campaign in a Snap</h2>
            <input
              type='text'
              placeholder='Enter your URL'
              value={url}
              readOnly
            />
          </div>
          <div className='analyze_container_right'>
            <h3>AI-Powered Ad Strategy for You</h3>
            <div className='loading_state'>
              <SimpleDotLoading text='Loading...' />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='analyze_screen'>
      <Stepper currentStepKey='step2' />

      <div className='analyze_container'>
        <div className='analyze_container_left'>
          <h2>Set Up Your Ad Campaign in a Snap</h2>
          <input
            type='text'
            placeholder='Enter your URL'
            value={url}
            readOnly
          />
        </div>

        <div className='analyze_container_right' ref={rightContainerRef}>
          <h3>AI-Powered Ad Strategy for You</h3>

          {/* Show initial loading state */}
          {initialLoading && (
            <div className='loading_state'>
              <SimpleDotLoading text='Loading project data...' />
            </div>
          )}

          {/* Show analysis data as soon as analyzing-points data is available */}
          {analyzingPoints && (
            <div className='analysis_results'>
              {/* Screenshot step - show first */}
              {showScreenshot && analyzingPoints?.parsingUrl?.screenshot && (
                <div
                  className='screenshot_container_parsing'
                  data-step='screenshot'
                >
                  <h4>
                    <svg
                      width='34'
                      height='34'
                      viewBox='0 0 34 34'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        d='M29 17.4975C29 19.5837 28.764 21.4338 28.2919 23.52C27.5838 26.5312 25.4988 28.6174 22.45 29.3062C18.4768 30.2313 14.2675 30.2313 10.3139 29.3062C7.52085 28.6174 5.18017 26.295 4.7081 23.52C4.23603 21.4338 4 19.3476 4 17.4975C4 15.4113 4.23603 13.5613 4.7081 11.4751C5.41621 8.46388 7.50118 6.37768 10.55 5.68884C12.4186 5.21649 14.5232 5 16.6279 5C18.7325 5 20.6011 5.23617 22.7057 5.68884C25.7349 6.37768 27.8395 8.46388 28.5476 11.4751C28.764 13.3251 29 15.4113 29 17.4975Z'
                        fill='#C5DAFF'
                      />
                      <path
                        d='M24.5 15C27.5376 15 30 12.5376 30 9.5C30 6.46244 27.5376 4 24.5 4C21.4624 4 19 6.46244 19 9.5C19 12.5376 21.4624 15 24.5 15Z'
                        fill='#005AFF'
                      />
                    </svg>
                    Parsing URL{' '}
                  </h4>
                  <div className='screenshot_container'>
                    <p>Checking the website...</p>
                    <img
                      src={analyzingPoints.parsingUrl.screenshot}
                      alt='Website Screenshot'
                      className='website_screenshot'
                      onLoad={handleScreenshotComplete}
                    />
                  </div>
                </div>
              )}

              {/* Three key boxes with sequential GSAP animation */}
              <div className='key_analysis_boxes'>
                {/* Product Information - First Box */}
                {showBox1 && (
                  <div className='key_box' data-box='1'>
                    <h4>
                      <svg
                        width='34'
                        height='34'
                        viewBox='0 0 34 34'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                      >
                        <path
                          d='M29 17.4975C29 19.5837 28.764 21.4338 28.2919 23.52C27.5838 26.5312 25.4988 28.6174 22.45 29.3062C18.4768 30.2313 14.2675 30.2313 10.3139 29.3062C7.52085 28.6174 5.18017 26.295 4.7081 23.52C4.23603 21.4338 4 19.3476 4 17.4975C4 15.4113 4.23603 13.5613 4.7081 11.4751C5.41621 8.46388 7.50118 6.37768 10.55 5.68884C12.4186 5.21649 14.5232 5 16.6279 5C18.7325 5 20.6011 5.23617 22.7057 5.68884C25.7349 6.37768 27.8395 8.46388 28.5476 11.4751C28.764 13.3251 29 15.4113 29 17.4975Z'
                          fill='#C5DAFF'
                        />
                        <path
                          d='M24.5 15C27.5376 15 30 12.5376 30 9.5C30 6.46244 27.5376 4 24.5 4C21.4624 4 19 6.46244 19 9.5C19 12.5376 21.4624 15 24.5 15Z'
                          fill='#005AFF'
                        />
                      </svg>
                      Product Information
                    </h4>
                    <div className='key_box_text'>
                      <GSAPTextReveal
                        key='product-info'
                        animateKey='product-info'
                        text={
                          analyzingPoints.productInformation?.description ||
                          'Analyzing product information...'
                        }
                        onComplete={handleBox1Complete}
                      />
                    </div>
                  </div>
                )}

                {/* Selling Points - Second Box */}
                {showBox2 && (
                  <div className='key_box' data-box='2'>
                    <h4>
                      <svg
                        width='34'
                        height='34'
                        viewBox='0 0 34 34'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                      >
                        <path
                          d='M29 17.4975C29 19.5837 28.764 21.4338 28.2919 23.52C27.5838 26.5312 25.4988 28.6174 22.45 29.3062C18.4768 30.2313 14.2675 30.2313 10.3139 29.3062C7.52085 28.6174 5.18017 26.295 4.7081 23.52C4.23603 21.4338 4 19.3476 4 17.4975C4 15.4113 4.23603 13.5613 4.7081 11.4751C5.41621 8.46388 7.50118 6.37768 10.55 5.68884C12.4186 5.21649 14.5232 5 16.6279 5C18.7325 5 20.6011 5.23617 22.7057 5.68884C25.7349 6.37768 27.8395 8.46388 28.5476 11.4751C28.764 13.3251 29 15.4113 29 17.4975Z'
                          fill='#C5DAFF'
                        />
                        <path
                          d='M24.5 15C27.5376 15 30 12.5376 30 9.5C30 6.46244 27.5376 4 24.5 4C21.4624 4 19 6.46244 19 9.5C19 12.5376 21.4624 15 24.5 15Z'
                          fill='#005AFF'
                        />
                      </svg>
                      Selling Points
                    </h4>
                    <div className='key_box_text'>
                      <GSAPTextReveal
                        key='selling-points'
                        animateKey='selling-points'
                        text={
                          analyzingPoints.sellingPoints?.description ||
                          'Analyzing selling points...'
                        }
                        onComplete={handleBox2Complete}
                      />
                    </div>
                  </div>
                )}

                {/* Ads Goal Strategy - Third Box */}
                {showBox3 && (
                  <div className='key_box' data-box='3'>
                    <h4>
                      <svg
                        width='34'
                        height='34'
                        viewBox='0 0 34 34'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                      >
                        <path
                          d='M29 17.4975C29 19.5837 28.764 21.4338 28.2919 23.52C27.5838 26.5312 25.4988 28.6174 22.45 29.3062C18.4768 30.2313 14.2675 30.2313 10.3139 29.3062C7.52085 28.6174 5.18017 26.295 4.7081 23.52C4.23603 21.4338 4 19.3476 4 17.4975C4 15.4113 4.23603 13.5613 4.7081 11.4751C5.41621 8.46388 7.50118 6.37768 10.55 5.68884C12.4186 5.21649 14.5232 5 16.6279 5C18.7325 5 20.6011 5.23617 22.7057 5.68884C25.7349 6.37768 27.8395 8.46388 28.5476 11.4751C28.764 13.3251 29 15.4113 29 17.4975Z'
                          fill='#C5DAFF'
                        />
                        <path
                          d='M24.5 15C27.5376 15 30 12.5376 30 9.5C30 6.46244 27.5376 4 24.5 4C21.4624 4 19 6.46244 19 9.5C19 12.5376 21.4624 15 24.5 15Z'
                          fill='#005AFF'
                        />
                      </svg>
                      Ads Goal Strategy
                    </h4>
                    <div className='key_box_text'>
                      <GSAPTextReveal
                        key='ads-goal-strategy'
                        animateKey='ads-goal-strategy'
                        text={
                          analyzingPoints.adsGoalStrategy?.description ||
                          'Analyzing ads goal strategy...'
                        }
                        onComplete={handleBox3Complete}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fallback display if we have analysisSuccess but no analyzingPoints */}
          {analysisSuccess && !analyzingPoints && (
            <div className='error_state'>
              <p>
                Analysis completed but analyzing points data is not available.
                Please check console for details.
              </p>
            </div>
          )}

          {/* Show simple dot loading animation */}
          {!analyzingPoints && (
            <div className='loading_state'>
              <SimpleDotLoading text='Analyzing your website...' />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default URLAnalyzerInterface;
