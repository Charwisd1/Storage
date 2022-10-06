import React, {PropsWithChildren} from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import Svg, {Path, Text, Circle} from 'react-native-svg';

export default function RollingProgressBar (props: PropsWithChildren<{
  bgColor? : string,
  size?: number,
  cirleWidth?: number,
  progress: number,
  unfilledColor?: string,
  filledColor?: string,
  textColor?: string,
  style?: ViewStyle,
  fontSize?: number, 
}>) {
  const defaultProps = {
    color: '#ff9f1e',
    unfilledColor: '#999999',
    bgColor: 'rgba(0, 0, 0, 0)',
    size: 40,
    cirleWidth: 4,
  };
  const hundred_precent = 0.9999;
  const zero_percent = 0.0001;

  const size = props.size ? props.size : defaultProps.size;
  const unfilledColor = props.unfilledColor ? props.unfilledColor : defaultProps.unfilledColor;
  const filledColor = props.filledColor ? props.filledColor : defaultProps.color;
  const bgColor = props.bgColor ? props.bgColor : defaultProps.bgColor;
  const circleWidth = props.cirleWidth ? props.cirleWidth : defaultProps.cirleWidth;
  const textColor = props.textColor ? props.textColor : filledColor;
  const progress = props.progress < 1 ? (props.progress === 0 ? zero_percent : props.progress === 1 ? zero_percent : props.progress) : hundred_precent;
  const fontSize = props.fontSize ? props.fontSize : size*0.3;

  const styles = StyleSheet.create({
    container: {
      justifyContent: 'center',
      alignItems: 'center',
      height: size,
      width: size,
      ...props.style,
    }
  })
  
  return (
    <View style={styles.container}>
      <Svg height={size} width={size} viewBox={"0 0 "+size+" "+size}>
        <Circle cx={size*0.5} cy={size*0.5} r={(size-circleWidth)*0.5} stroke="none" strokeWidth={circleWidth} fill={bgColor}/>
        <Path d={
          "M"+size*0.5+" "+circleWidth*0.5+
          "A"+(size-circleWidth)*0.5+" "+(size-circleWidth)*0.5+" 0 "+(progress<=0.5?1:0)+" 0 "+
            (size*0.5*(1+Math.cos(Math.PI*(-progress*2+0.5)))-circleWidth*0.5*Math.cos(Math.PI*(-progress*2+0.5)))+" "+
            (size*0.5*(1-Math.sin(Math.PI*(-progress*2+0.5)))-circleWidth*0.5*Math.sin(Math.PI*(-progress*2+1.5)))
        } fill="none" stroke={unfilledColor} strokeWidth={circleWidth} />
        <Path d={
          "M"+size*0.5+" "+circleWidth*0.5+
          "A"+(size-circleWidth)*0.5+" "+(size-circleWidth)*0.5+" 0 "+(progress<=0.5?0:1)+" 1 "+
            (size*0.5*(1+Math.cos(Math.PI*(-progress*2+0.5)))-circleWidth*0.5*Math.cos(Math.PI*(-progress*2+0.5)))+" "+
            (size*0.5*(1-Math.sin(Math.PI*(-progress*2+0.5)))-circleWidth*0.5*Math.sin(Math.PI*(-progress*2+1.5)))
        } fill="none" stroke={filledColor} strokeWidth={circleWidth} />
        <Text fill={textColor} stroke="none" fontSize={fontSize} x={size*0.5} y={size*0.5+fontSize*0.25} textAnchor="middle">{Math.round(progress*100)}%</Text>
      </Svg>
    </View>
  )
}