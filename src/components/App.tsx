import React, { useState } from 'react'
import TopNav, { Tab } from './TopNav'
import ImprovedDashboard from './ImprovedDashboard'
import DQEngineView from './DQEngineView'
import MetadataAssessmentView from './MetadataAssessmentView'

const App: React.FC = () => {
    const [tab, setTab] = useState<Tab>('dashboard')
    return (
        <>
            <TopNav tab={tab} setTab={setTab} />
            {tab === 'dashboard' && <ImprovedDashboard />}
            {tab === 'dq' && <DQEngineView />}
            {tab === 'metadata' && <MetadataAssessmentView />}
        </>
    )
}

export default App
