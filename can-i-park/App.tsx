import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { runOcrOnUri } from './src/ocr';
import { evaluateRulesFromText } from './src/parser';
import type { Verdict } from './src/types';
import * as ImagePicker from 'expo-image-picker';

export default function App() {
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [debugInfo, setDebugInfo] = useState<{ ocrText: string; confidence: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text>Checking camera permissions…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePhoto = async () => {
    try {
      console.log('App: Taking photo...');
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8, skipProcessing: true });
      if (photo?.uri) {
        console.log('App: Photo captured, URI:', photo.uri);
        setPhotoUri(photo.uri);
        setIsProcessing(true);
        setVerdict(null);
        setDebugInfo(null);
        console.log('App: Starting OCR...');
        const ocr = await runOcrOnUri(photo.uri);
        console.log('App: OCR completed. Text:', ocr.text, 'Confidence:', ocr.confidence);
        setDebugInfo({ ocrText: ocr.text, confidence: ocr.confidence || 0 });
        console.log('App: Evaluating rules from text:', ocr.text);
        const result = evaluateRulesFromText(ocr.text);
        console.log('App: Parser result:', result);
        setVerdict(result);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('App: Error in takePhoto:', error);
      setVerdict({ status: 'uncertain', reason: 'Failed to capture photo' });
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setPhotoUri(null);
    setVerdict(null);
    setDebugInfo(null);
    setShowDebug(false);
    setIsProcessing(false);
    setShowCamera(false);
  };

  const startCamera = () => {
    setShowCamera(true);
  };

  const importFromPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets?.[0]?.uri) {
      const uri = result.assets[0].uri;
      console.log('App: Image selected from photos, URI:', uri);
      setPhotoUri(uri);
      setIsProcessing(true);
      setVerdict(null);
      setDebugInfo(null);
      console.log('App: Starting OCR...');
      const ocr = await runOcrOnUri(uri);
      console.log('App: OCR completed. Text:', ocr.text, 'Confidence:', ocr.confidence);
      setDebugInfo({ ocrText: ocr.text, confidence: ocr.confidence || 0 });
      console.log('App: Evaluating rules from text:', ocr.text || '');
      const res = evaluateRulesFromText(ocr.text || '');
      console.log('App: Parser result:', res);
      setVerdict(res);
      setIsProcessing(false);
    }
  };

  // Show menu screen first
  if (!showCamera && !photoUri) {
    return (
      <View style={styles.menuContainer}>
        <View style={styles.menuHeader}>
          <Text style={styles.menuTitle}>Can I Park Here?</Text>
          <Text style={styles.menuSubtitle}>Scan parking signs to check if you can park there!</Text>
        </View>
        
        <View style={styles.menuOptions}>
          <TouchableOpacity style={styles.menuButton} onPress={startCamera}>
            <View style={styles.menuButtonIcon}>
              <Text style={styles.menuButtonEmoji}>📸</Text>
            </View>
            <Text style={styles.menuButtonTitle}>Take a Photo</Text>
            <Text style={styles.menuButtonDescription}>Use your camera to scan a sign</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.menuButton, styles.menuButtonSecondary]} onPress={importFromPhotos}>
            <View style={[styles.menuButtonIcon, { backgroundColor: '#4b5563' }]}>
              <Text style={styles.menuButtonEmoji}>📷</Text>
            </View>
            <Text style={styles.menuButtonTitle}>Import Photo</Text>
            <Text style={styles.menuButtonDescription}>Choose from your photo library</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!photoUri ? (
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back">
            <View style={styles.headerOverlay}>
              <Text style={styles.headerTitle}>Can I Park Here?</Text>
              <TouchableOpacity style={styles.backButton} onPress={() => setShowCamera(false)}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.captureBar}>
              <View style={styles.bottomControls}>
                <TouchableOpacity style={styles.importButton} onPress={importFromPhotos}>
                  <Text style={styles.importButtonText}>📷 Import Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shutter} onPress={takePhoto} />
                <View style={styles.shutterPlaceholder} />
              </View>
            </View>
          </CameraView>
        </View>
      ) : (
        <ScrollView style={styles.previewContainer} contentContainerStyle={styles.previewContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Can I Park Here?</Text>
          </View>
          <Image source={{ uri: photoUri }} style={styles.preview} />
          
          {isProcessing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#111827" />
              <Text style={styles.processingText}>Processing sign...</Text>
            </View>
          ) : verdict && (
            <View style={styles.resultsContainer}>
              <View style={[styles.verdictBadge, verdict.status === 'ok' ? styles.ok : verdict.status === 'not_ok' ? styles.notOk : styles.uncertain]}>
                <Text style={styles.verdictText}>
                  {verdict.status === 'ok' ? '✅ OK to Park' : verdict.status === 'not_ok' ? '❌ Do NOT Park' : '⚠️ Uncertain'}
                </Text>
              </View>
              
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Details:</Text>
                <Text style={styles.reason}>{verdict.reason}</Text>
              </View>
              
              {verdict?.nextSafeStartLocal && (
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Next Safe Time:</Text>
                  <Text style={styles.next}>{verdict.nextSafeStartLocal}</Text>
                </View>
              )}
            </View>
          )}
          
          {debugInfo && (
            <View style={styles.debugSection}>
              <TouchableOpacity 
                style={styles.debugHeader}
                onPress={() => setShowDebug(!showDebug)}
              >
                <Text style={styles.debugTitle}>🔍 Debug Info</Text>
                <Text style={styles.debugToggle}>{showDebug ? '▼' : '▶'}</Text>
              </TouchableOpacity>
              {showDebug && (
                <View style={styles.debugContainer}>
                  <View style={styles.debugRow}>
                    <Text style={styles.debugLabel}>OCR Text:</Text>
                    <Text style={styles.debugText}>"{debugInfo.ocrText}"</Text>
                  </View>
                  <View style={styles.debugRow}>
                    <Text style={styles.debugLabel}>Confidence:</Text>
                    <Text style={styles.debugText}>{Math.round(debugInfo.confidence * 100)}%</Text>
                  </View>
                </View>
              )}
            </View>
          )}
          
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.button, styles.secondary]} onPress={importFromPhotos}>
              <Text style={styles.buttonText}>📷 Import Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={reset}>
              <Text style={styles.buttonText}>🔄 Scan Another</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    backgroundColor: '#111827',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  menuContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  menuHeader: {
    alignItems: 'center',
    marginBottom: 60,
  },
  menuTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  menuSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  menuOptions: {
    gap: 20,
  },
  menuButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#111827',
  },
  menuButtonSecondary: {
    borderColor: '#4b5563',
    backgroundColor: '#f9fafb',
  },
  menuButtonIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  menuButtonEmoji: {
    fontSize: 40,
  },
  menuButtonTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  menuButtonDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  headerOverlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  backButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  camera: {
    flex: 1,
  },
  captureBar: {
    position: 'absolute',
    bottom: 36,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 40,
  },
  importButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  importButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    opacity: 0.9,
    borderWidth: 4,
    borderColor: '#e5e7eb',
  },
  shutterPlaceholder: {
    width: 72,
    height: 72,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  previewContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
    paddingTop: 0,
  },
  preview: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  processingText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  resultsContainer: {
    gap: 12,
  },
  verdictBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ok: { backgroundColor: '#16a34a' },
  notOk: { backgroundColor: '#dc2626' },
  uncertain: { backgroundColor: '#f59e0b' },
  verdictText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  infoCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#e5e7eb',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  reason: {
    color: '#111827',
    fontSize: 16,
    lineHeight: 22,
  },
  next: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  debugSection: {
    marginTop: 8,
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  debugTitle: {
    fontWeight: '600',
    color: '#374151',
    fontSize: 14,
  },
  debugToggle: {
    color: '#6b7280',
    fontSize: 12,
  },
  debugContainer: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  debugRow: {
    marginBottom: 8,
  },
  debugLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  debugText: {
    fontSize: 12,
    color: '#374151',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  button: {
    flex: 1,
    backgroundColor: '#111827',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondary: {
    backgroundColor: '#4b5563',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  actionsRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 12,
  },
});
