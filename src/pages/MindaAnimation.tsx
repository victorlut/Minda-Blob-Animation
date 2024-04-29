import { RouteComponentProps } from '@reach/router';
import React from 'react';
import { SpeechAnimationComponent } from '../components/SpeechAnimationComponent';


export const MindaAnimationPage: React.FunctionComponent<RouteComponentProps> = (props: RouteComponentProps) => {
  
  return (
    <SpeechAnimationComponent idleVolumeLimit={7} idleTimeout={5000}></SpeechAnimationComponent>
  );
};
