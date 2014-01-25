#include <Wire.h>

// AdaFruit NFC Shield I2C library: https://github.com/adafruit/Adafruit_NFCShield_I2C
#include <Adafruit_NFCShield_I2C.h>

// input pin definitions
#define LIGHT_SENSOR A0
#define SOUND_SENSOR A2
#define MOTION_SENSOR 8
#define BUTTON 6

// amount of times the light sensor is measured during a lightInterval
#define LIGHT_RESOLUTION 10

// size of sound samples and sound sample frames
#define SOUND_SAMPLE_RESOLUTION 4
#define SOUND_FRAME_RESOLUTION 100

// light sensor data and options
unsigned long lastLight = 0;
const unsigned long lightInterval = 10000;
const float lightValueDivisor = 7.8;  // light sensor returns values between 0 and ca. 780
unsigned int lightValues[LIGHT_RESOLUTION] = {0};
unsigned int lightValueSum = 0;
unsigned char currentLightValueIndex = 0;
const unsigned long lightSensorInterval = lightInterval / LIGHT_RESOLUTION;
unsigned long lastLightSensor = 0;

// sound sensor data and options
unsigned long soundFrame[SOUND_FRAME_RESOLUTION] = {0};
unsigned char currentSoundSample = 0;
unsigned char currentSoundFrame = 0;
unsigned long soundSampleSum = 0;
unsigned long soundFrameSum = 0;
const unsigned char soundValueDivisor = 10;      // shrink the sensor values a bit
unsigned long lastSoundSensor = 0;
const unsigned long minBeatValue = 1200 * SOUND_SAMPLE_RESOLUTION;  // minimal required sound strength for a beat
const float beatThreshold = 4.75;  // base minimal factor for beat detection, changed by soundSampleSum and soundStrengthDivisor
const unsigned int soundStrengthDivisor = 1875 * SOUND_SAMPLE_RESOLUTION;  // beat detection depends on overall sound strength
const unsigned long beatInterval = 350;  // minimal time (ms) between two beats
unsigned long lastBeat = 0;
boolean beatReady = false;

// motion sensor timer
unsigned long lastMotion = 0;
const unsigned long motionInterval = 10000;  // minimal time between two motions
boolean motionReady = false;

// button timer and options
unsigned long lastButton = 0;
const unsigned long buttonInterval = 10000;  // minimal time between two button presses
boolean buttonReady = false;
unsigned int buttonCycles = 0;
const unsigned int minButtonCycles = 500;

// RFID/NFC data, timer and options
unsigned long lastNfc = 0;
const unsigned long nfcInterval = 5000;  // minimal time between two NFC detections
boolean nfcReady = false;
unsigned char nfcWaited = 0;
const unsigned char nfcWaitCycles = 1000;  // number of how many cycles shall be waited until a NFC search is started

Adafruit_NFCShield_I2C nfc(2, 3);
boolean nfcFound;
uint8_t nfcUid[] = { 0, 0, 0, 0, 0, 0, 0 };  // Buffer to store the returned UID
uint8_t nfcUidLength;                        // Length of the UID (4 or 7 bytes depending on ISO14443A card type)



void setup() {

  Serial.begin(115200);

  pinMode(LIGHT_SENSOR, INPUT); 
  pinMode(SOUND_SENSOR, INPUT);
  pinMode(MOTION_SENSOR, INPUT);
  pinMode(BUTTON, INPUT_PULLUP);


  nfc.begin();

  // Set the max number of retry attempts to read from a card
  // This prevents us from waiting forever for a card, which is
  // the default behaviour of the PN532.
  nfc.setPassiveActivationRetries(0);

  // configure board to read RFID tags
  nfc.SAMConfig();

}


void loop() {

  unsigned long currentTime = millis();

  //
  // light sensor
  // sample of LIGHT_RESOLUTION values is measured and summed up in lightValueSum
  //

  if(currentTime - lastLightSensor > lightSensorInterval) {

    lightValueSum -= lightValues[currentLightValueIndex];

    // fit sensor value in 8bit variable
    lightValues[currentLightValueIndex] = analogRead(LIGHT_SENSOR)/lightValueDivisor;

    lightValueSum += lightValues[currentLightValueIndex];

    currentLightValueIndex++;

    if(currentLightValueIndex >= LIGHT_RESOLUTION) {
      currentLightValueIndex = 0;
    }

    lastLightSensor = currentTime;

  }

  //
  // periodical output of light sensor status
  //

  if(currentTime - lastLight > lightInterval) {
    int avgLightValue = lightValueSum / LIGHT_RESOLUTION;
    
    if(avgLightValue > 100) {
      avgLightValue = 100;
    }
    
    Serial.write("{\"light\":");
    Serial.print(avgLightValue);
    Serial.write("}\n");

    lastLight = currentTime;
  }


  //
  // beat detection (sound sensor)
  //
  // every cycle the square amplitude is added to the current sample sum
  // after the sum is complete (SOUND_SAMPLE_RESOLUTION values), it is inserted into the frame list
  // and compared to the average of all frames
  //

  // skip 0-values from sensor
  int i = 0;
  int currentSoundVal = 0;
  while(currentSoundVal == 0 && i < 20) {
    currentSoundVal = analogRead(SOUND_SENSOR);
    i++;
  }

  currentSoundVal = currentSoundVal / soundValueDivisor;
  soundSampleSum += currentSoundVal*currentSoundVal;

  currentSoundSample++;
  
  // sample complete
  // add to frame list and check if beat can be detected
  if(currentSoundSample >= SOUND_SAMPLE_RESOLUTION) {
    currentSoundSample = 0;

    soundFrameSum -= soundFrame[currentSoundFrame];
    soundFrame[currentSoundFrame] = soundSampleSum;
    soundFrameSum += soundFrame[currentSoundFrame];

    currentSoundFrame++;

    if(currentSoundFrame >= SOUND_FRAME_RESOLUTION) {
      currentSoundFrame = 0;
    }

    if(beatReady || currentTime - lastBeat > beatInterval) {
      beatReady = true;

      if(soundSampleSum > minBeatValue) {
        
        // factor of difference between the current sample sum and sum of all saved frames
        float factor = ((float) soundSampleSum / (soundFrameSum / SOUND_FRAME_RESOLUTION));

        // to detect a beat, the factor has to be above a configured threshold
        // the factor is influenced by the overall loudness of the sample, as beats in loud music are not as much louder than in quiet music
        if(factor > beatThreshold - (float) soundSampleSum / soundStrengthDivisor) {
          
          Serial.write("{\"action\":\"beat\",\"strength\":");
          Serial.print(soundSampleSum);
          Serial.write(",\"factor\":");
          Serial.print(factor);
          Serial.write("}\n");

          beatReady = false;
          lastBeat = currentTime;
          
        }
      }

    }
    
    soundSampleSum = 0;
  }


  //
  // motion detection
  //

  if(motionReady || currentTime - lastMotion > motionInterval) {
    motionReady = true;

    if(digitalRead(MOTION_SENSOR) == HIGH) {
      Serial.write("{\"action\":\"motion\"}\n");
      lastMotion = currentTime;
      motionReady = false;
    }
  }

  //
  // button press
  //

  if(buttonReady || currentTime - lastButton > buttonInterval) {
    buttonReady = true;

    if(digitalRead(BUTTON) == LOW) {
      
      // only detect button press if pressed long enough
      buttonCycles++;

      if(buttonCycles > minButtonCycles) {
        Serial.write("{\"action\":\"button\"}\n");
        lastButton = currentTime;
        buttonCycles = 0;
        buttonReady = false;
      }
    }
  }


  //
  // NFC/RFID
  //

  if(nfcReady || currentTime - lastNfc > nfcInterval) {
    nfcReady = true;

    // wait an amount of cycles until reading the NFC sensor (slow!)
    nfcWaited++;

    if(nfcWaited > nfcWaitCycles) {
      nfcWaited = 0;

      // Wait for an ISO14443A type cards (Mifare, etc.).  When one is found
      // 'uid' will be populated with the UID, and uidLength will indicate
      // if the uid is 4 bytes (Mifare Classic) or 7 bytes (Mifare Ultralight)
      nfcFound = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, &nfcUid[0], &nfcUidLength);

      if (nfcFound) {
        Serial.write("{\"nfc\":\"");
        for (uint8_t i=0; i < nfcUidLength; i++) 
        {
          Serial.print(nfcUid[i], HEX); 
        }
        Serial.write("\"}\n");

        lastNfc = currentTime;
        nfcReady = false;
      }
    }

  }

}


