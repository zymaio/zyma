import React, { useEffect } from 'react';
import { slotRegistry } from '../../core/SlotRegistry';
import { useTranslation } from 'react-i18next';
import { RecentWorkspacesList } from './RecentWorkspacesList';
import './WelcomeScreen.css';

export interface WelcomeScreenProps {
    productName: string;
    extraContent?: React.ReactNode;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ productName, extraContent }) => {
    const { t } = useTranslation();
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);

    useEffect(() => {
        const unsub = slotRegistry.subscribe(() => forceUpdate());
        return () => unsub();
    }, []);

    return (
        <div className="welcome-container">
            <div className="welcome-wrapper">
                <div className="welcome-header">
                    <div className="welcome-logo-box">
                        <svg width="64" height="64" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="512" height="512" rx="100" fill="#FF4D4F"/>
                            <path d="M190 100H430L250 260H390L150 420L220 260H130L190 100Z" fill="white"/>
                        </svg>
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
                        {/* Render injected content (e.g., Environment List) */}
                        {extraContent}

                        {/* Render legacy slot contributions */}
                        {slotRegistry.getContributedComponents('WELCOME_CONTENT').map(c => {
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
