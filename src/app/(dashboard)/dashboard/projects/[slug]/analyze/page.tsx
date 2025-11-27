'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import './analyze.css';
import Stepper from '@/components/dashboard/Stepper';
import AnalysisTimeline from '@/components/dashboard/AnalysisTimeline';
import { gsap } from 'gsap';

// Configure GSAP to prevent auto-sleep and ensure animations continue
if (typeof window !== 'undefined') {
  gsap.config({
    autoSleep: 60, // Disable auto-sleep (default is 2 seconds)
    force3D: true, // Force hardware acceleration
    nullTargetWarn: false, // Reduce console warnings
  });
}

// Custom hook to handle tab visibility and ensure animations continue
const useTabVisibility = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsVisible(visible);

      if (visible) {
        // When tab becomes visible, resume all GSAP animations
        gsap.globalTimeline.resume();
        // Resume any paused timelines
        const allTweens = (gsap as any).getAllTweens?.();
        if (allTweens) {
          allTweens.forEach((tween: any) => {
            if (tween.isActive() && tween.paused()) {
              tween.resume();
            }
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
};

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

// Global storage for animation state (persists across tab changes)
const animationStorage = new Map<
  string,
  { startTime: number; targetInterval: number }
>();

// Typewriter Text Component - Character by character typing
// Uses time-based animation that continues even when tab is hidden
const TypewriterText = ({
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
  const hasAnimated = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const currentIndexRef = useRef<number>(0);
  const isAnimatingRef = useRef<boolean>(false);
  const targetInterval = 30; // milliseconds between characters

  useEffect(() => {
    if (typeof window === 'undefined' || !text) return;

    // Check if this key has already been animated completely
    if (hasAnimated.current === animateKey) return;

    // Check if animation is already running for this key
    const existingState = animationStorage.get(animateKey);

    if (textRef.current) {
      // Clear any existing timeout, animation frame, or interval
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }

      // If animation already exists, restore from stored state (resume from where it left off)
      if (existingState && existingState.startTime > 0) {
        startTimeRef.current = existingState.startTime;
        isAnimatingRef.current = true;
        textRef.current.classList.add('typing-cursor');

        // Immediately sync to current position
        const updateToCurrentPosition = () => {
          if (!textRef.current) return;
          const now = Date.now();
          const elapsed = now - startTimeRef.current;
          const expectedIndex = Math.min(
            Math.floor(elapsed / targetInterval),
            text.length
          );
          currentIndexRef.current = expectedIndex;
          textRef.current.textContent = text.slice(0, currentIndexRef.current);
        };
        updateToCurrentPosition();
      } else {
        // New animation - reset to empty
        textRef.current.textContent = '';
        textRef.current.classList.remove(
          'typewriter-animation',
          'typing-cursor'
        );
        currentIndexRef.current = 0;
        startTimeRef.current = 0;
        isAnimatingRef.current = false;
      }

      // Define animation update function that works even in background
      const updateAnimation = () => {
        if (!textRef.current || !isAnimatingRef.current) return;

        // Use wall-clock time (Date.now()) which is not affected by tab visibility
        const now = Date.now();

        // If startTime wasn't set yet, set it now
        if (startTimeRef.current === 0) {
          startTimeRef.current = now;
          animationStorage.set(animateKey, { startTime: now, targetInterval });
        }

        const elapsed = now - startTimeRef.current;
        const expectedIndex = Math.min(
          Math.floor(elapsed / targetInterval),
          text.length
        );

        // Update text if we've progressed or if we're restoring from background
        if (
          expectedIndex !== currentIndexRef.current &&
          expectedIndex <= text.length
        ) {
          currentIndexRef.current = expectedIndex;
          textRef.current.textContent = text.slice(0, currentIndexRef.current);
        }

        // Check if animation is complete
        if (currentIndexRef.current >= text.length) {
          // Remove cursor when typing is complete
          textRef.current.classList.remove('typing-cursor');
          textRef.current.classList.add('typewriter-animation');
          hasAnimated.current = animateKey;
          isAnimatingRef.current = false;

          // Clean up storage
          animationStorage.delete(animateKey);

          // Clean up timers
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }

          // Call onComplete after a short delay
          if (onComplete) {
            timeoutRef.current = setTimeout(() => {
              onComplete();
            }, 300);
          }
          return;
        }

        // Continue animation - use requestAnimationFrame when tab is visible for smoothness
        // When tab is hidden, browsers throttle setTimeout, but we still use it as backup
        // The key is that we always calculate progress from wall-clock time
        if (document.visibilityState === 'visible') {
          rafRef.current = requestAnimationFrame(() => {
            updateAnimation();
          });
        } else {
          // In background: use a longer interval (browsers throttle to ~1s anyway)
          // But our time-based calculation will catch up immediately when tab becomes visible
          intervalRef.current = setTimeout(
            () => {
              updateAnimation();
            },
            Math.max(targetInterval, 100)
          );
        }
      };

      // Start or resume animation
      const startTyping = () => {
        if (!textRef.current) return;

        // If not already animating, initialize
        if (!isAnimatingRef.current) {
          startTimeRef.current = Date.now();
          animationStorage.set(animateKey, {
            startTime: startTimeRef.current,
            targetInterval,
          });
          currentIndexRef.current = 0;
          isAnimatingRef.current = true;
          textRef.current.classList.add('typing-cursor');
        }

        // Start the animation loop
        updateAnimation();
      };

      // Wait for box to be fully visible and ready (only if not already started)
      if (!existingState) {
        timeoutRef.current = setTimeout(() => {
          if (!textRef.current) return;

          // Ensure the element is visible
          const checkVisibility = () => {
            if (!textRef.current) return false;
            const rect = textRef.current.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          };

          if (!checkVisibility()) {
            // Retry after a short delay if not visible yet
            timeoutRef.current = setTimeout(() => {
              if (!textRef.current || !checkVisibility()) return;
              startTyping();
            }, 200);
            return;
          }

          startTyping();
        }, 150);
      } else {
        // Animation was already started, resume immediately
        startTyping();
      }

      // Also listen for visibility changes to resume immediately when tab becomes visible
      const handleVisibilityChange = () => {
        if (
          document.visibilityState === 'visible' &&
          isAnimatingRef.current &&
          textRef.current
        ) {
          // Cancel any pending setTimeout and switch to requestAnimationFrame
          if (intervalRef.current) {
            clearTimeout(intervalRef.current);
            intervalRef.current = null;
          }
          // Immediately update and continue with RAF
          updateAnimation();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        if (intervalRef.current) {
          clearTimeout(intervalRef.current);
          intervalRef.current = null;
        }
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange
        );
      };
    }

    // Cleanup storage if component unmounts
    return () => {
      // Don't delete storage here - we want it to persist across tab changes
      // Only delete when animation completes
    };
  }, [text, onComplete, animateKey, targetInterval]);

  return <p ref={textRef} className={`${className} typewriter-text`}></p>;
};

const URLAnalyzerInterface = () => {
  const params = useParams();
  const router = useRouter();
  const projectId = params.slug as string;
  const isVisible = useTabVisibility(); // Use tab visibility hook

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
  const [animationKey, setAnimationKey] = useState(0);
  const rightContainerRef = useRef<HTMLDivElement>(null);

  // Fetch project data + trigger analysis
  const fetchProjectData = async () => {
    try {
    
      setInitialLoading(true);
      setError(null);
      setLoading(false);

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
      }

      // Check if analyzing_points already exists in database
      if (project.analysing_points) {
        const points =
          typeof project.analysing_points === 'string'
            ? JSON.parse(project.analysing_points)
            : project.analysing_points;

        setInitialLoading(false);
        setAnalyzingPoints(points);
        setAnalysisSuccess(true);
        setLoading(false);
        // The animation will trigger via the useEffect hooks
        return;
      }

      // No analyzing points found, start the analysis process
      setInitialLoading(false);
      await analyzeURL(projectId);
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

      // Add timeout for the analyzing-points API (5 minutes)
      const analyzingPointsFetchPromise = fetch('/api/analyzing-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('Request timed out after 5 minutes')),
          5 * 60 * 1000
        );
      });


      // Step 1: Call analyzing-points API first with timeout
      const analyzingPointsResponse = (await Promise.race([
        analyzingPointsFetchPromise,
        timeoutPromise,
      ])) as Response;

      if (!analyzingPointsResponse.ok) {
        const errorText = await analyzingPointsResponse.text();
        throw new Error(
          `Analysis failed with status ${analyzingPointsResponse.status}. Please check the browser console for details.`
        );
      }

      const analyzingPointsResult = await analyzingPointsResponse.json();
      if (!analyzingPointsResult.success) {
        throw new Error(
          analyzingPointsResult.error ||
            'Analysis failed. Please try again or contact support.'
        );
      }

      // Show UI immediately when analyzing points finishes
      setAnalyzingPoints(analyzingPointsResult.analysing_points);
      setAnalysisSuccess(true);
      const actualDuration = Date.now() - startTime;
      setAnalysisDuration(actualDuration);

      // Step 2: Call website-analysis API after analyzing-points completes (with timeout)
      try {
        const websiteAnalysisFetchPromise = fetch('/api/website-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: projectId }),
        });

        const websiteAnalysisResponse = (await Promise.race([
          websiteAnalysisFetchPromise,
          timeoutPromise,
        ])) as Response;

        if (!websiteAnalysisResponse.ok) {
          // Don't throw error here - UI can still work with analyzing points data
            const errorText = await websiteAnalysisResponse.text();
        } else {
          const websiteAnalysisResult = await websiteAnalysisResponse.json();
        }
      } catch (websiteAnalysisError: any) {
        // Don't fail the entire process - analyzing points is already done
      }
    } catch (err: any) {
      setError(
        err.message ||
          'Failed to analyze the website. Please refresh the page and try again.'
      );
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

  // Handle tab visibility changes to ensure animations continue
  useEffect(() => {
    if (isVisible && analyzingPoints) {
      // When tab becomes visible and we have data, ensure animations are running
      // This helps resume any paused animations
      gsap.globalTimeline.resume();
    }
  }, [isVisible, analyzingPoints]);

  useEffect(() => {
    if (projectId && isClient) fetchProjectData();
  }, [projectId, isClient]);

  // Reset box states when analyzingPoints changes
  useEffect(() => {
    if (analyzingPoints) {
      setShowBox1(false);
      setShowBox2(false);
      setShowBox3(false);
      setShowScreenshot(false);
      setAllAnimationsComplete(false);
      setAnimationKey(prev => prev + 1); // Increment to force re-animation

      // Start with screenshot after a short delay
      setTimeout(() => {
        setShowScreenshot(true);
      }, 500);
    }
  }, [analyzingPoints]);

  // Handle navigation to next page via button click
  const handleNextClick = () => {
    router.push(`/dashboard/projects/${projectId}/confirming`);
  };

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
      behavior: 'auto',
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
          if (box2) {
            scrollToElement(box2 as HTMLElement);
          } else {
          }
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
    }, 800); // Reduced delay for faster navigation
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
          {/* Next Button - Only show when all animations are complete */}
          {allAnimationsComplete && (
            <div className='next_button_container'>
              <button
                onClick={handleNextClick}
                className='next_button'
              >
                Next
              </button>
            </div>
          )}
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
                    <p className='mb-2'>Checking out your page...</p>
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
                      <TypewriterText
                        key={`product-info-${animationKey}`}
                        animateKey={`product-info-${animationKey}`}
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
                      <TypewriterText
                        key={`selling-points-${animationKey}`}
                        animateKey={`selling-points-${animationKey}`}
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
                      <TypewriterText
                        key={`ads-goal-strategy-${animationKey}`}
                        animateKey={`ads-goal-strategy-${animationKey}`}
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

          {/* Show error state if there's an error */}
          {error && !analyzingPoints && (
            <div className='error_state'>
              <h4 style={{ color: '#ef4444', marginBottom: '16px' }}>
                Analysis Error
              </h4>
              <p style={{ color: '#737373', marginBottom: '16px' }}>{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  analyzeURL(projectId);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#005AFF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Retry Analysis
              </button>
              <p
                style={{
                  marginTop: '16px',
                  fontSize: '14px',
                  color: '#737373',
                }}
              >
                Or{' '}
                <a
                  href='/dashboard'
                  style={{ color: '#005AFF', textDecoration: 'underline' }}
                >
                  go back to dashboard
                </a>
              </p>
            </div>
          )}

          {/* Show loading during analysis */}
          {!error && loading && !analyzingPoints && (
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
