# Can I Park Here? 🚗

A mobile application that scans street signs and parking rules to validate if you can park at a given location and time. Designed to help drivers avoid confusing parking signage and prevent tickets.

## Overview

This app uses OCR (Optical Character Recognition) to extract text from parking signs, parses the rules, and provides clear verdicts on whether parking is allowed at the current time. It handles complex, confusing signs that often trip up drivers.

## Features

### Core Functionality
- 📸 **Camera Capture** - Take photos of street signs directly in the app
- 📷 **Photo Import** - Import existing photos from your device
- 🔍 **Cloud OCR** - Extract text from sign images using OCR.space API
- 📋 **Rule Parsing** - Parse common and complex parking sign patterns
- ✅ **Verdict Display** - Clear OK/Not OK/Uncertain status with reasoning
- ⏰ **Next Safe Time** - Shows when parking becomes safe again

### Supported Sign Patterns

#### Basic Patterns
- No parking with time windows (e.g., "NO PARKING MON & THU 9AM-11AM")
- Street cleaning schedules (e.g., "STREET CLEANING MON 9AM-11AM")
- 2-hour parking limits with time restrictions

#### Complex Patterns
- **Permit Zones** - "PERMIT REQUIRED EXCEPT SUNDAYS"
- **Complex No-Parking** - "NO PARKING MON-FRI 8AM-6PM EXCEPT PERMIT HOLDERS"
- **Loading Zones** - Time-restricted commercial vehicle areas
- **Tow Away Zones** - Safety-critical no-park areas
- **Handicap/Accessible** - Special permit requirements
- **Fire Zones/Hydrants** - Emergency access restrictions

### Debug Features
- Raw OCR text display
- Confidence scores
- Debug panel for troubleshooting

## Tech Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **OCR Service**: OCR.space API (cloud-based)
- **Camera**: expo-camera
- **Image Picker**: expo-image-picker
- **File System**: expo-file-system

## Setup

### Prerequisites
- Node.js >= 20.19.4
- npm or yarn
- Expo Go app (for testing on physical device)
- iOS Simulator or Android Emulator (for development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/bariaga1/test_code.git
cd can-i-park
```

2. Install dependencies:
```bash
npm install
```

3. Configure OCR API key:
   - Get a free API key from [OCR.space](https://ocr.space/ocrapi)
   - Add it to `app.json` under `expo.extra.OCRSPACE_API_KEY`
   - Or set as environment variable: `OCRSPACE_API_KEY=your_key_here`

4. Start the development server:
```bash
npm run ios    # For iOS simulator
npm run android # For Android emulator
npm run web     # For web browser
```

### Running on Physical Device

1. Install Expo Go on your phone
2. Start the dev server:
```bash
npx expo start --lan
```
3. Scan the QR code in Expo Go or enter the URL manually

## Project Structure

```
can-i-park/
├── App.tsx              # Main app component with camera UI
├── app.json             # Expo configuration
├── src/
│   ├── types.ts         # TypeScript type definitions
│   ├── ocr.ts           # OCR integration (OCR.space API)
│   └── parser.ts        # Parking rule parser logic
└── assets/              # App icons and splash screens
```

## How It Works

1. **Capture/Import** - User takes a photo or imports from gallery
2. **OCR Processing** - Image is sent to OCR.space API to extract text
3. **Rule Parsing** - Parser matches text against known sign patterns
4. **Time Evaluation** - Checks current day/time against restrictions
5. **Verdict Display** - Shows clear status with reasoning and next safe time

## Testing

The app includes debug features to help with testing:
- View raw OCR text to verify extraction accuracy
- Check confidence scores to assess OCR reliability
- Test with various sign types and lighting conditions

### Test Cases to Try
- Simple time-based restrictions
- Permit zones with exceptions
- Multiple rules on same sign
- Blurry or poorly lit photos
- Different sign formats and fonts

## Future Enhancements

- [ ] On-device OCR (ML Kit) for privacy and speed
- [ ] Location-based rule memory
- [ ] History of past scans
- [ ] Support for multiple stacked signs
- [ ] Integration with city parking APIs
- [ ] Manual time picker for planning ahead

## Contributing

This is a personal project, but suggestions and feedback are welcome!

## License

MIT

## Version History

- **v0.1.0** - Initial MVP with camera, OCR, and basic parser
- **Latest** - Added debugging UI and complex sign parser patterns
