import { Tabs } from 'antd';

interface CompetitorAnalysisProps {
  businessSummary?: string;
  campaignName?: string;
  competitorAnalysis?: any;
  loading: boolean;
}

export default function CompetitorAnalysis({
  businessSummary,
  campaignName,
  competitorAnalysis,
  loading,
}: CompetitorAnalysisProps) {
  return (
    <>
      <div className='heading_block'>
        <h2>
          <span>AI-Powered</span> Competitor Insights
        </h2>
        <p>
          Get data-driven intelligence on competitors to optimize your ad
          strategy.
        </p>
      </div>
      <Tabs
        defaultActiveKey='1'
        items={[
          {
            key: '1',
            label: 'Competitor Analysis',
            children: (
              <div className='tab-content'>
                <p className='description'>
                  {loading
                    ? 'Loading competitor analysis...'
                    : competitorAnalysis?.compettitorAnalysis
                        ?.advertisingStrategyImplications ||
                      'The competitive landscape analysis is being prepared...'}
                </p>
                <div className='competitor-details'>
                  <div className='competitor-table'>
                    <div className='table-header'>
                      <div className='header-item'>Competitor</div>
                      <div className='header-item'>Strengths</div>
                    </div>
                    {loading ? (
                      <div className='table-row'>
                        <div className='row-item'>Loading...</div>
                        <div className='row-item'>Please wait...</div>
                      </div>
                    ) : competitorAnalysis?.compettitorAnalysis?.competitors ? (
                      Object.entries(
                        competitorAnalysis.compettitorAnalysis.competitors
                      ).map(([competitor, strengths], index) => (
                        <div key={index} className='table-row'>
                          <div className='row-item'>{competitor}</div>
                          <div className='row-item'>{strengths as string}</div>
                        </div>
                      ))
                    ) : (
                      <div className='table-row'>
                        <div className='row-item'>
                          No competitor data available
                        </div>
                        <div className='row-item'>
                          Please generate analysis first
                        </div>
                      </div>
                    )}
                  </div>
                  <div className='advertising-strategy'>
                    <h3>Advertising Strategy Implications:</h3>
                    <p>
                      {loading
                        ? 'Loading strategy implications...'
                        : competitorAnalysis?.compettitorAnalysis
                            ?.advertisingStrategyImplications ||
                          'Strategy implications will be available after analysis generation.'}
                    </p>
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: '2',
            label: 'Hot Topics Analysis',
            children: (
              <div className='tab-content'>
                <p className='description'>
                  {loading
                    ? 'Loading competitor analysis...'
                    : competitorAnalysis?.compettitorAnalysis
                        ?.advertisingStrategyImplications ||
                      'The competitive landscape analysis is being prepared...'}
                </p>
                <div className='competitor-details'>
                  <div className='competitor-table'>
                    <div className='table-header'>
                      <div className='header-item'>Trend</div>
                      <div className='header-item'>Description</div>
                    </div>
                    {loading ? (
                      <div className='table-row'>
                        <div className='row-item'>Loading...</div>
                        <div className='row-item'>Please wait...</div>
                      </div>
                    ) : competitorAnalysis?.hotTopicsAnalysis?.trends ? (
                      Object.entries(
                        competitorAnalysis.hotTopicsAnalysis.trends
                      ).map(([trend, description], index) => (
                        <div key={index} className='table-row'>
                          <div className='row-item'>{trend}</div>
                          <div className='row-item'>
                            {description as string}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className='table-row'>
                        <div className='row-item'>No trend data available</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: '3',
            label: 'Keywords Analysis',
            children: (
              <div className='tab-content'>
                <p className='description'>
                  {loading
                    ? 'Loading keyword analysis...'
                    : 'A comprehensive list of search and ad keywords relevant to your business offerings.'}
                </p>
                <div className='competitor-details'>
                  <div className='competitor-table'>
                    <div className='table-header'>
                      <div className='header-item'>Type</div>
                      <div className='header-item'>Keywords</div>
                    </div>
                    {loading ? (
                      <div className='table-row'>
                        <div className='row-item'>Loading...</div>
                        <div className='row-item'>Please wait...</div>
                      </div>
                    ) : competitorAnalysis?.keywordAnalysis?.keywords ? (
                      Object.entries(
                        competitorAnalysis.keywordAnalysis.keywords
                      ).map(([keywordType, keywords], index) => (
                        <div key={index} className='table-row'>
                          <div className='row-item'>{keywordType}</div>
                          <div className='row-item keywords-list'>
                            {typeof keywords === 'string'
                              ? keywords.split(',').map((keyword, idx) => (
                                  <span key={idx} className='keyword-tag'>
                                    {keyword.trim().replace(/^'|'$/g, '')}
                                  </span>
                                ))
                              : String(keywords)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className='table-row'>
                        <div className='row-item'>
                          No keyword data available
                        </div>
                        <div className='row-item'>
                          Please generate analysis first
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: '4',
            label: 'Community Reviews Analysis',
            children: 'Content of Community Reviews Analysis',
          },
          {
            key: '5',
            label: 'Consolidated Analysis',
            children: 'Content of Consolidated Analysis',
          },
        ]}
      />
    </>
  );
}
