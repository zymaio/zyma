import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { DynamicIcon } from './DynamicIcon';
import { slotRegistry } from '../../core/SlotRegistry';
import { commands } from '../CommandSystem/CommandRegistry';
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

    // 默认底座品牌 (Zyma)
    const defaultLogo = (
        <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
            <rect width="512" height="512" rx="100" fill="#FF4D4F"/>
            <path d="M190 100H430L250 260H390L150 420L220 260H130L190 100Z" fill="white"/>
        </svg>
    );

    return (
        <div className="welcome-container">
            <div className="welcome-wrapper">
                <div className="welcome-header">
                    <div className="welcome-logo-box" style={{ backgroundColor: 'transparent' }}>
                         {customConfig.logoSvg ? (
                             <div dangerouslySetInnerHTML={{ __html: customConfig.logoSvg }} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
                         ) : defaultLogo}
                    </div>
                    <div>
                        <h1 style={{ fontSize: '2.8em', fontWeight: '900', fontStyle: 'italic', letterSpacing: '-0.05em', margin: 0 }}>
                            {customConfig.mainTitle || productName.toUpperCase()} 
                            {customConfig.subTitle && (
                                <span style={{ fontSize: '0.6em', fontStyle: 'normal', fontWeight: 'bold', marginLeft: '12px', color: customConfig.accentColor || 'var(--accent-color)', opacity: 0.9 }}>
                                    {customConfig.subTitle}
                                </span>
                            )}
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