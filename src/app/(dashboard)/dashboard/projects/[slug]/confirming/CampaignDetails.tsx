'use client';
import { Dropdown, DatePicker } from 'antd';
import { useState, useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import dayjs from 'dayjs';
import LocationDropdownMap from './CityAutocomplete';

interface Location {
  description: string;
  lat: number;
  lng: number;
}

interface CampaignDetailsProps {
  projectData: any;
  loading: boolean;
  campaignName?: string;
  businessSummary?: string;
  onFormDataChange?: (data: any) => void;
}

interface FormData {
  selectedGoal: string;
  selectedCta: string;
  startDate: string;
  endDate: string;
}

export default function CampaignDetails({
  projectData,
  loading,
  campaignName,
  businessSummary: initialBusinessSummary,
  onFormDataChange,
}: CampaignDetailsProps) {
  const {
    control,
    watch,
    getValues,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      selectedGoal: '',
      selectedCta: '',
      startDate: '',
      endDate: '',
    },
    mode: 'onChange',
  });

  const [touched, setTouched] = useState({
    selectedGoal: false,
    selectedCta: false,
    startDate: false,
    endDate: false,
  });

  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [businessSummary, setBusinessSummary] = useState<string>(
    initialBusinessSummary || ''
  );

  const watchedValues = watch();
  // Watch individual fields to ensure proper change detection
  const selectedGoal = watch('selectedGoal');
  const selectedCta = watch('selectedCta');
  const startDate = watch('startDate');
  const endDate = watch('endDate');

  const handleLocationChange = useCallback((locations: Location[]) => {
    setSelectedLocations(locations);
  }, []);

  // Helper function to safely create dayjs object from string
  const getDateValue = (dateString: string) => {
    if (!dateString || dateString === '') return null;
    try {
      return dayjs(dateString);
    } catch {
      return null;
    }
  };

  const adGoals = [
    {
      id: 'traffic',
      title: 'Traffic',
      desc: 'Get more people to visit your website',
    },
    {
      id: 'engagement',
      title: 'Engagement',
      desc: 'Increase interactions with your posts',
    },
    {
      id: 'leads',
      title: 'Leads',
      desc: 'Generate leads for your business',
    },
  ];

  const ctaOptions = [
    { key: 'shop_now', label: 'Shop Now' },
    { key: 'view_shop', label: 'View Shop' },
    { key: 'see_collection', label: 'See Collection' },
    { key: 'get_offer', label: 'Get Offer' },
    { key: 'get_deal', label: 'Get Deal' },
    { key: 'install_now', label: 'Install Now' },
    { key: 'play_game', label: 'Play Game' },
    { key: 'use_app', label: 'Use App' },
    { key: 'download', label: 'Download' },
    { key: 'open_link', label: 'Open Link' },
    { key: 'send_message', label: 'Send Message' },
    { key: 'send_whatsapp_message', label: 'Send WhatsApp Message' },
    { key: 'send_sms', label: 'Send SMS' },
    { key: 'send_email', label: 'Send Email' },
    { key: 'contact_us', label: 'Contact Us' },
    { key: 'book_now', label: 'Book Now' },
    { key: 'get_quote', label: 'Get Quote' },
    { key: 'learn_more', label: 'Learn More' },
    { key: 'subscribe', label: 'Subscribe' },
    { key: 'apply_now', label: 'Apply Now' },
    { key: 'get_started', label: 'Get Started' },
    { key: 'watch_more', label: 'Watch More' },
    { key: 'explore_more', label: 'Explore More' },
    { key: 'discover_how_it_works', label: 'Discover How It Works' },
    { key: 'see_how_others_did_it', label: 'See How Others Did It' },
    { key: 'watch_demo', label: 'Watch Demo' },
    { key: 'act_fast', label: 'Act Fast' },
    { key: 'last_chance', label: 'Last Chance' },
    { key: 'get_it_before_its_gone', label: "Get It Before It's Gone" },
    { key: 'limited_time_offer', label: 'Limited Time Offer' },
    { key: 'talk_to_us', label: 'Talk to Us' },
    { key: 'request_callback', label: 'Request a Callback' },
    { key: 'see_plans_pricing', label: 'See Plans & Pricing' },
    { key: 'claim_free_trial', label: 'Claim Free Trial' },
  ];

  // Validation functions
  const validateField = (fieldName: keyof FormData, value: string): string => {
    switch (fieldName) {
      case 'selectedGoal':
        return !value || value.trim() === '' ? 'Please select an ad goal' : '';
      case 'selectedCta':
        return !value || value.trim() === ''
          ? 'Please select a call to action'
          : '';
      case 'startDate':
        return !value || value.trim() === '' ? 'Start date is required' : '';
      case 'endDate':
        return !value || value.trim() === '' ? 'End date is required' : '';
      default:
        return '';
    }
  };

  const getFieldError = (fieldName: keyof FormData): string => {
    if (!touched[fieldName]) return '';
    return validateField(fieldName, watchedValues[fieldName]);
  };

  // Check if form is valid
  const isFormValid = (): boolean => {
    const allFieldsValid = Object.keys(watchedValues).every(key => {
      const fieldKey = key as keyof FormData;
      return validateField(fieldKey, watchedValues[fieldKey]) === '';
    });
    return allFieldsValid;
  };

  // Function to notify parent component
  const notifyParent = useCallback(() => {
    if (onFormDataChange) {
      // Use getValues() to get the latest form values synchronously
      const currentValues = getValues();
      const formErrors: { [key: string]: string } = {};
      
      Object.keys(currentValues).forEach(key => {
        const fieldKey = key as keyof FormData;
        const error = validateField(fieldKey, currentValues[fieldKey]);
        if (error) formErrors[fieldKey] = error;
      });

      // Check if form is valid using current values
      const allFieldsValid = Object.keys(currentValues).every(key => {
        const fieldKey = key as keyof FormData;
        return validateField(fieldKey, currentValues[fieldKey]) === '';
      });

      onFormDataChange({
        formData: currentValues,
        isValid: allFieldsValid,
        errors: formErrors,
        businessSummary: businessSummary,
      });
    }
  }, [onFormDataChange, getValues, businessSummary]);

  // Mark field as touched and notify parent
  const handleFieldChange = useCallback((fieldName: keyof FormData) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    // Trigger validation for this field
    trigger(fieldName);
    // Notify parent immediately - getValues() will have the latest value
    notifyParent();
  }, [notifyParent, trigger]);

  // Handle business summary change
  const handleBusinessSummaryChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setBusinessSummary(e.target.value);
  };

  // Sync businessSummary with prop when it changes
  useEffect(() => {
    if (initialBusinessSummary && initialBusinessSummary !== businessSummary) {
      setBusinessSummary(initialBusinessSummary);
    }
  }, [initialBusinessSummary]);

  // Watch form values and notify parent whenever they change
  // This ensures the parent is always updated with the latest form state
  useEffect(() => {
    notifyParent();
  }, [
    selectedGoal,
    selectedCta,
    startDate,
    endDate,
    businessSummary,
    notifyParent,
  ]);

  return (
    <>
      <div className='heading_block'>
        <h2>
          Define Your <span>Campaign Details</span>
        </h2>
        <p>
          Enter your business details and targeting to create a campaign that
          fits your vision.
        </p>
      </div>

      <div className='campaign_row'>
        <div className='content_left'>
          <div className='field'>
            <label>Project Name</label>
            <input type='text' value={campaignName || 'Loading...'} readOnly />
          </div>

          <div className='field'>
            <label>Business Summary </label>
            <textarea
              value={businessSummary}
              onChange={handleBusinessSummaryChange}
              placeholder='Enter a comprehensive summary of your business '
              rows={10}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                lineHeight: '1.5',
                minHeight: '200px',
              }}
            />
            <p style={{ 
              fontSize: '12px', 
              color: '#666', 
              marginTop: '4px',
              fontStyle: 'italic'
            }}>
              Word count: {businessSummary.trim() ? businessSummary.trim().split(/\s+/).length : 0} words
            </p>
          </div>

          <div className='field'>
            <label>Target Location</label>
            <LocationDropdownMap
              value={selectedLocations}
              onChange={handleLocationChange}
            />
          </div>
        </div>

        <div className='content_right'>
          <div
            className={`field ${
              getFieldError('selectedGoal') ? 'has-error' : ''
            }`}
          >
            <label>Set Ad Goal</label>
            <Controller
              name='selectedGoal'
              control={control}
              render={({ field }) => (
                <div className='ad_goal_box_row'>
                  {adGoals.map(goal => (
                    <label
                      key={goal.id}
                      className={`ad_goal_box ${
                        field.value === goal.id ? 'active' : ''
                      }`}
                    >
                      <input
                        type='radio'
                        name='ad_goal'
                        value={goal.id}
                        checked={field.value === goal.id}
                        onChange={() => {
                          field.onChange(goal.id);
                          handleFieldChange('selectedGoal');
                        }}
                        className='hidden'
                      />
                      <span className='icon'>
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          width='24'
                          height='24'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        >
                          <path d='M16.05 10.966a5 2.5 0 0 1-8.1 0' />
                          <path d='m16.923 14.049 4.48 2.04a1 1 0 0 1 .001 1.831l-8.574 3.9a2 2 0 0 1-1.66 0l-8.574-3.91a1 1 0 0 1 0-1.83l4.484-2.04' />
                          <path d='M16.949 14.14a5 2.5 0 1 1-9.9 0L10.063 3.5a2 2 0 0 1 3.874 0z' />
                          <path d='M9.194 6.57a5 2.5 0 0 0 5.61 0' />
                        </svg>
                      </span>
                      <h4>{goal.title}</h4>
                      <p>{goal.desc}</p>
                      <div className='check'>
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          width='24'
                          height='24'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        >
                          <circle cx='12' cy='12' r='10' />
                          <path d='m9 12 2 2 4-4' />
                        </svg>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            />
            {getFieldError('selectedGoal') && (
              <p className='error-message'>{getFieldError('selectedGoal')}</p>
            )}
          </div>

          <div
            className={`field ${
              getFieldError('selectedCta') ? 'has-error' : ''
            }`}
          >
            <label>Call To Action</label>
            <Controller
              name='selectedCta'
              control={control}
              render={({ field }) => (
                <Dropdown
                  menu={{
                    items: ctaOptions,
                    onClick: e => {
                      const selectedOption = ctaOptions.find(
                        opt => opt.key === e.key
                      );
                      if (selectedOption) {
                        field.onChange(selectedOption.label);
                        handleFieldChange('selectedCta');
                      }
                    },
                    style: {
                      maxHeight: '300px',
                      overflowY: 'auto',
                    },
                  }}
                  placement='bottomLeft'
                  arrow
                  trigger={['click']}
                  onOpenChange={open => {
                    if (!open) {
                      handleFieldChange('selectedCta');
                    }
                  }}
                  dropdownRender={menu => (
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {menu}
                    </div>
                  )}
                >
                  <div className='dropdown_input'>
                    <span style={{ color: field.value ? 'inherit' : '#999' }}>
                      {field.value || 'Select CTA'}
                    </span>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      width='24'
                      height='24'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    >
                      <path d='m6 9 6 6 6-6' />
                    </svg>
                  </div>
                </Dropdown>
              )}
            />
            {getFieldError('selectedCta') && (
              <p className='error-message'>{getFieldError('selectedCta')}</p>
            )}
          </div>

          <div
            className={`field date_field ${
              getFieldError('startDate') || getFieldError('endDate')
                ? 'has-error'
                : ''
            }`}
          >
            <div className='sub_block'>
              <label>Start Date</label>
              <Controller
                name='startDate'
                control={control}
                render={({ field }) => (
                  <DatePicker
                    onChange={(date, dateString) => {
                      field.onChange(dateString || '');
                      handleFieldChange('startDate');
                    }}
                    className='custom_date_picker'
                    value={getDateValue(field.value)}
                    placeholder='Select start date'
                    onBlur={() => handleFieldChange('startDate')}
                  />
                )}
              />
              {getFieldError('startDate') && (
                <p className='error-message'>{getFieldError('startDate')}</p>
              )}
            </div>

            <div className='sub_block'>
              <label>End Date</label>
              <Controller
                name='endDate'
                control={control}
                render={({ field }) => (
                  <DatePicker
                    onChange={(date, dateString) => {
                      field.onChange(dateString || '');
                      handleFieldChange('endDate');
                    }}
                    className='custom_date_picker'
                    value={getDateValue(field.value)}
                    placeholder='Select end date'
                    onBlur={() => handleFieldChange('endDate')}
                  />
                )}
              />
              {getFieldError('endDate') && (
                <p className='error-message'>{getFieldError('endDate')}</p>
              )}
            </div>
          </div>

          <p
            style={{
              marginTop: '12px',
              fontSize: '14px',
              color: '#666',
              lineHeight: '1.5',
            }}
          >
            Meta ads typically need 2–3 days to calibrate and scale. Run for{' '}
            <span style={{ color: '#7E52E0', fontWeight: '500' }}>
              at least 3 days
            </span>{' '}
            for optimal results.
          </p>
        </div>
      </div>
    </>
  );
}
