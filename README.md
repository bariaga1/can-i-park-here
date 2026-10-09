# Can I Park Here? 🚗

A mobile application that scans street signs and parking rules to validate if you can park at a given location and time. Designed to help drivers avoid confusing parking signage and prevent tickets.

## Overview

This app uses OCR (Optical Character Recognition) to extract text from parking signs, parses the rules, and provides clear verdicts on whether parking is allowed at the current time. It handles complex, confusing signs that often trip up drivers.

## Features

### Core Functionality
- **Home menu** - Choose Take a Photo or Import Photo before opening the camera
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
- **Private / unauthorized parking** - Private lots and unauthorized-vehicle tow warnings
- **Handicap/Accessible** - Special permit requirements
- **Fire Zones/Hydrants** - Emergency access restrictions

Simple one-rule signs like the fixtures in `can-i-park/test-fixtures/` parse correctly. Multi-clause and stacked plaques (several rules on one pole) are **not** handled yet: the parser often returns after the first matching time window.

### Debug Features
- Raw OCR text display
- Confidence scores
- Debug panel for troubleshooting

## Tech Stack

- **Framework**: React Native with Expo SDK 54 (`expo@~54.0.37`)
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
git clone https://github.com/bariaga1/can-i-park-here.git
cd can-i-park-here/can-i-park
```

2. Install dependencies:
```bash
npm install
```

3. Configure OCR API key:
   - Get a free API key from [OCR.space](https://ocr.space/ocrapi)
   - Add it to `app.json` under `expo.extra.OCRSPACE_API_KEY`
   - Or set as environment variable: `OCRSPACE_API_KEY=your_key_here`

4. Start the development server (same Wi-Fi as your phone for Expo Go):
```bash
npx expo start --lan
```

Or:
```bash
npm run ios     # For iOS simulator
npm run android # For Android emulator
npm run web     # For web browser
```

### Running on Physical Device

1. Install Expo Go on your phone
2. From `can-i-park/`, start the packager:
```bash
npx expo start --lan
```
3. Scan the QR code in Expo Go, or open `exp://<your-lan-ip>:8081`

The app opens on the home menu. Camera permission is requested only when you tap Take a Photo, and photo library permission only when you tap Import Photo. If camera access was previously denied, the app offers a shortcut to Settings.

## Project Structure

```
can-i-park/
├── App.tsx              # Home menu, camera, import, and results UI
├── app.json             # Expo configuration
├── src/
│   ├── types.ts         # TypeScript type definitions
│   ├── ocr.ts           # OCR integration (OCR.space API)
│   └── parser.ts        # Parking rule parser logic
├── test-fixtures/       # Simple mock signs plus real photo fixtures
│   ├── run-simple-sign-ocr.ts
│   └── real/            # Real-world signs (stacked / multi-clause)
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

### Simple sign fixtures

`can-i-park/test-fixtures/` has five one-rule mock signs (weekday no-parking, Mon & Thu, street cleaning, 2-hour parking, fire zone). Against clean OCR text they produce the expected OK / Do Not Park verdicts for the current day and time.

Run them through OCR + parser:

```bash
cd can-i-park
npx tsx test-fixtures/run-simple-sign-ocr.ts
```

Import the PNGs in Expo Go to confirm the on-device badge matches.

### Real stacked-sign fixture

`can-i-park/test-fixtures/real/NYPT-parking-signs-3-news-signs-one-pole.jpg` is a three-plaque NYC-style pole:

- No standing Mon–Fri 7am–10am and 2pm–7pm
- 3-hour commercial metered parking Mon–Fri 10am–2pm (others no standing)
- 1-hour metered parking Saturday 9am–7pm

The transcribed text is saved next to the photo. The current parser latches onto the first time window (`7AM–10AM`) and ignores the rest, so a Tuesday 3pm scan would incorrectly look allowed.

### Test Cases to Try
- Simple time-based restrictions (the mock fixtures above)
- Permit zones with exceptions
- Stacked / multi-clause signs (known gap)
- Blurry or poorly lit photos
- Different sign formats and fonts

## Future Enhancements

- [ ] Split long OCR dumps into clauses and evaluate all of them (strictest rule wins)
- [ ] Support for multiple stacked signs / plaques in one photo
- [ ] On-device OCR (ML Kit) for privacy and speed
- [ ] Location-based rule memory
- [ ] History of past scans
- [ ] Integration with city parking APIs
- [ ] Manual time picker for planning ahead

## Contributing

This is a personal project, but suggestions and feedback are welcome!

## License

MIT

## Version History

- **v0.1.0** - Initial MVP with camera, OCR, and basic parser
- **Latest** - Home menu, private/unauthorized parking patterns, Expo SDK 54 package alignment, simple-sign fixtures, and a real stacked-sign fixture documenting the multi-clause parser gap
