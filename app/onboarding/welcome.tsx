import { router } from 'expo-router';
import React, { useRef } from 'react';
import {
    Animated,
    Image,
    ImageBackground,
    Pressable,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScaleButtonProps = {
  children: React.ReactNode;
  style: any;
  onPress?: () => void;
};

function ScaleButton({ children, style, onPress }: ScaleButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.985,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <ImageBackground
        source={require('../../assets/images/welcome-bg.png')}
        style={{ flex: 1 }}
        resizeMode="cover"
        imageStyle={{
          transform: [{ scale: 1.04 }],
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.58)',
            justifyContent: 'space-between',
            paddingHorizontal: 24,
            paddingTop: 18,
            paddingBottom: 24,
          }}
        >
          <View style={{ alignItems: 'center', marginTop: 6 }}>
            <View
              style={{
                width: 208,
                height: 208,
                borderRadius: 44,
                backgroundColor: 'rgba(250,204,21,0.07)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
                borderWidth: 1,
                borderColor: 'rgba(250,204,21,0.16)',
                overflow: 'hidden',
              }}
            >
              <Image
                source={require('../../assets/images/SH Logo.png')}
                style={{
                  width: 208,
                  height: 208,
                  transform: [{ scale: 1.28 }],
                }}
                resizeMode="contain"
              />
            </View>

            <Text
              style={{
                color: '#ffffff',
                fontSize: 37,
                fontWeight: '900',
                marginBottom: 10,
              }}
            >
              Side Hustlers
            </Text>

            <Text
              style={{
                color: '#f4f4f5',
                fontSize: 16,
                textAlign: 'center',
                lineHeight: 23,
                maxWidth: 320,
                fontWeight: '500',
              }}
            >
              Smarter order decisions for gig drivers
            </Text>
          </View>

          <View style={{ marginTop: 18 }}>
            <ScaleButton
              onPress={() => router.push('/onboarding/auth?mode=signup' as const)}
              style={{
                backgroundColor: '#facc15',
                paddingVertical: 18,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <Text
                style={{
                  color: '#111111',
                  fontSize: 16,
                  fontWeight: '900',
                }}
              >
                Continue with Email
              </Text>
            </ScaleButton>

            <ScaleButton
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(18,18,22,0.92)',
                paddingVertical: 17,
                paddingHorizontal: 20,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.14)',
                marginBottom: 14,
              }}
            >
              <Image
                source={require('../../assets/images/google_logo_clean_transparent.png')}
                style={{ width: 32, height: 32 }}
                resizeMode="contain"
              />

              <View style={{ flex: 1, alignItems: 'center', marginRight: 32 }}>
                <Text
                  style={{
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: 15,
                  }}
                >
                  Continue with Google
                </Text>
              </View>
            </ScaleButton>

            <ScaleButton
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#000000',
                paddingVertical: 17,
                paddingHorizontal: 20,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#000000',
              }}
            >
              <Image
                source={require('../../assets/images/apple_logo_clean_transparent.png')}
                style={{
                  width: 32,
                  height: 32,
                  tintColor: '#ffffff',
                }}
                resizeMode="contain"
              />

              <View style={{ flex: 1, alignItems: 'center', marginRight: 32 }}>
                <Text
                  style={{
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: 15,
                  }}
                >
                  Continue with Apple
                </Text>
              </View>
            </ScaleButton>
          </View>

          <Text
            style={{
              color: 'rgba(255,255,255,0.58)',
              fontSize: 12,
              textAlign: 'center',
              lineHeight: 18,
              paddingHorizontal: 10,
            }}
          >
            By continuing, you agree to our Terms and Privacy Policy.
          </Text>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}