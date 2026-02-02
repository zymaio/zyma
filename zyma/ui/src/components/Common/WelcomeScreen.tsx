import React, { useEffect } from 'react';
import { DynamicIcon } from './DynamicIcon';
import { slotRegistry } from '../../core/SlotRegistry';
import { useTranslation } from 'react-i18next';
import { RecentWorkspacesList } from './RecentWorkspacesList';
import './WelcomeScreen.css';

export const WelcomeScreen: React.FC<{ productName: string }> = ({ productName }) => {
    const { t } = useTranslation();
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);

    const slotConfigs = slotRegistry.getContributedComponents('WELCOME_CONTENT');
    const customConfig = (slotConfigs.length > 0 ? slotConfigs[0].params : null) || {};

    useEffect(() => {
        const unsub = slotRegistry.subscribe(() => forceUpdate());
        return () => unsub();
    }, []);

    return (
        <div className="welcome-container">
            <div className="welcome-wrapper">
                <div className="welcome-header">
                    <div className="welcome-logo-box" style={{ backgroundColor: customConfig.accentColor || 'var(--accent-color)' }}>
                         {customConfig.logoSvg ? (
                             <div dangerouslySetInnerHTML={{ __html: customConfig.logoSvg }} style={{ width: '40px', height: '40px' }} />
                         ) : (
                             <DynamicIcon icon={customConfig.logoIcon || "Layout"} size={32} className="text-white" />
                         )}
                    </div>
                    <div>
                        <h1 style={{ fontSize: '2.8em', fontWeight: '900', fontStyle: 'italic', letterSpacing: '-0.05em', margin: 0 }}>
                            {productName.toUpperCase()}
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontWeight: 'bold', marginTop: '4px', fontSize: '0.8em', textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.8 }}>
                            {t('ProfessionalDevelopmentEnvironment')}
                        </p>
                    </div>
                </div>

                <div className="welcome-grid">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        {slotConfigs.map(c => {
                            const Content = c.component;
                            return <React.Fragment key={c.id}>
                                {typeof Content === 'function' ? <Content /> : Content}
                            </React.Fragment>;
                        })}
                    </div>

                    <div>
                        <RecentWorkspacesList />
                    </div>
                </div>
            </div>
        </div>
    );
};
