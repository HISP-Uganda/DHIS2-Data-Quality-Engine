import React, { useState } from 'react'
import TopNav, { Tab } from './TopNav'
import DashboardView from './DashboardView'
import DQEngineView from './DQEngineView'
import MetadataAssessmentView from './MetadataAssessmentView'

const App: React.FC = () => {
    const [tab, setTab] = useState<Tab>('dashboard')
    return (
        <>
            <TopNav tab={tab} setTab={setTab} />
            {tab === 'dashboard' && <DashboardView />}
            {tab === 'dq' && <DQEngineView />}
            {tab === 'metadata' && <MetadataAssessmentView />}
        </>
    )
}

export default App
