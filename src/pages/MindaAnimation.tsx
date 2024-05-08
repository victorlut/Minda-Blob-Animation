import { RouteComponentProps } from '@reach/router';
import React from 'react';
import { SpeechAnimationComponent } from '../components/SpeechAnimationComponent';


export const MindaAnimationPage: React.FunctionComponent<RouteComponentProps> = (props: RouteComponentProps) => {
  
  return (
    <SpeechAnimationComponent idleVolumeLimit={10} idleTimeout={3000}></SpeechAnimationComponent>
  );
};
