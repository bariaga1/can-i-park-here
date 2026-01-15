import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
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
        console.log('App: Starting OCR...');
        const ocr = await runOcrOnUri(photo.uri);
        console.log('App: OCR completed. Text:', ocr.text, 'Confidence:', ocr.confidence);
        setDebugInfo({ ocrText: ocr.text, confidence: ocr.confidence || 0 });
        console.log('App: Evaluating rules from text:', ocr.text);
        const result = evaluateRulesFromText(ocr.text);
        console.log('App: Parser result:', result);
        setVerdict(result);
      }
    } catch (error) {
      console.error('App: Error in takePhoto:', error);
      setVerdict({ status: 'uncertain', reason: 'Failed to capture photo' });
    }
  };

  const reset = () => {
    setPhotoUri(null);
    setVerdict(null);
    setDebugInfo(null);
  };

  const importFromPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets?.[0]?.uri) {
      const uri = result.assets[0].uri;
      console.log('App: Image selected from photos, URI:', uri);
      setPhotoUri(uri);
      console.log('App: Starting OCR...');
      const ocr = await runOcrOnUri(uri);
      console.log('App: OCR completed. Text:', ocr.text, 'Confidence:', ocr.confidence);
      setDebugInfo({ ocrText: ocr.text, confidence: ocr.confidence || 0 });
      console.log('App: Evaluating rules from text:', ocr.text || '');
      const res = evaluateRulesFromText(ocr.text || '');
      console.log('App: Parser result:', res);
      setVerdict(res);
    }
  };

  return (
    <View style={styles.container}>
      {!photoUri ? (
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back">
            <View style={styles.captureBar}>
              <TouchableOpacity style={styles.shutter} onPress={takePhoto} />
            </View>
          </CameraView>
        </View>
      ) : (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photoUri }} style={styles.preview} />
          {verdict && (
            <View style={[styles.verdictBadge, verdict.status === 'ok' ? styles.ok : verdict.status === 'not_ok' ? styles.notOk : styles.uncertain]}>
              <Text style={styles.verdictText}>
                {verdict.status === 'ok' ? 'OK to Park' : verdict.status === 'not_ok' ? 'Do NOT Park' : 'Uncertain'}
              </Text>
            </View>
          )}
          {verdict && <Text style={styles.reason}>{verdict.reason}</Text>}
          {verdict?.nextSafeStartLocal && (
            <Text style={styles.next}>Next safe: {verdict.nextSafeStartLocal}</Text>
          )}
          {debugInfo && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>Debug Info:</Text>
              <Text style={styles.debugText}>OCR Text: "{debugInfo.ocrText}"</Text>
              <Text style={styles.debugText}>Confidence: {Math.round(debugInfo.confidence * 100)}%</Text>
            </View>
          )}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.button, styles.secondary]} onPress={importFromPhotos}>
              <Text style={styles.buttonText}>Import from Photos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={reset}>
              <Text style={styles.buttonText}>Scan another sign</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
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
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    opacity: 0.9,
  },
  previewContainer: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  preview: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
  },
  verdictBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ok: { backgroundColor: '#16a34a' },
  notOk: { backgroundColor: '#dc2626' },
  uncertain: { backgroundColor: '#f59e0b' },
  verdictText: {
    color: '#fff',
    fontWeight: '600',
  },
  reason: {
    color: '#111827',
  },
  next: {
    color: '#374151',
  },
  button: {
    marginTop: 'auto',
    backgroundColor: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondary: {
    backgroundColor: '#4b5563',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  actionsRow: {
    marginTop: 'auto',
    flexDirection: 'row',
    gap: 12,
  },
  debugContainer: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  debugTitle: {
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  debugText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
});
