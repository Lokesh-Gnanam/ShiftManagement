import os
import sys
import subprocess
from pathlib import Path

# Create directories
AUDIO_DIR = Path("audio_uploads")
AUDIO_DIR.mkdir(exist_ok=True)

# Mock data from your main.py
MOCK_DB_LOGS = [
    {
        "id": "PMP-001", 
        "title": "Pump 3 Cavitation", 
        "transcript": "Pump 3 sounds like marbles. Check suction line for blockage.", 
        "machine": "Centrifugal Pump P3", 
        "issue": "Cavitation", 
        "root_cause": "Intake strainer 80% blocked by debris.",
        "resolution": "Flush intake strainer and verify NPSH flow.", 
        "confidence": 0.98, 
        "audio_url": None, 
        "timestamp": "2026-03-26T14:45:00"
    },
    {
        "id": "HVAC-004", 
        "title": "Cooling Tower VFD Trip", 
        "transcript": "VFD on Cooling Tower 4 is tripping during high-load shifts.", 
        "machine": "Cooling Tower 4", 
        "issue": "VFD Fault", 
        "root_cause": "Heat dissipation failure in the control cabinet cooling fan.",
        "resolution": "Replace cabinet filters and check fan motor continuity.", 
        "confidence": 0.99, 
        "audio_url": None, 
        "timestamp": "2026-03-26T15:20:00"
    },
    {
        "id": "CNC-009", 
        "title": "Spindle Axis Deviation", 
        "transcript": "CNC-9 spindle is drifting 0.5mm on the Y-axis after 2 hours of runtime.", 
        "machine": "CNC-9 Lathe", 
        "issue": "Axis Drift", 
        "root_cause": "Thermal expansion of the lead screw due to lubrication failure.",
        "resolution": "Reset zero-point; purge lubrication lines; check pump pressure.", 
        "confidence": 1.0, 
        "audio_url": None, 
        "timestamp": "2026-03-26T16:10:00"
    },
    {
        "id": "MOCK-HYD-04", 
        "title": "Hydraulic Press 4 Pressure Drop", 
        "transcript": "He inspected the hydraulic assembly, press 4, found a slight pressure drop and replaced the O-ring.", 
        "machine": "Hydraulic Assembly / Press 4", 
        "issue": "Pressure Drop", 
        "root_cause": "O-ring seal fatigue",
        "resolution": "Inspected hydraulic assembly; replaced O-ring in Press 4; pressure restored.", 
        "confidence": 0.99, 
        "audio_url": None, 
        "timestamp": "2026-03-27T10:00:00"
    }
]

# Extended scripts for more realistic voice logs
VOICE_SCRIPTS = {
    "PMP-001": [
        "Hey, this is senior tech Ravi. I'm at Pump 3 right now. It sounds like it's full of marbles or rocks. Definitely cavitation. I think the intake strainer is clogged. Need to flush it out and check the NPSH flow.",
        "Pump 3 is making a terrible rattling noise. Sounds like marbles inside. Suction line might be blocked. Gonna check the intake strainer first."
    ],
    "HVAC-004": [
        "Cooling Tower 4 just tripped again during the high load shift. The VFD is showing an overtemp fault. I noticed the cabinet cooling fan isn't running. The filters look clogged too. We need to replace the cabinet filters and check the fan motor continuity.",
        "VFD on Cooling Tower 4 keeps tripping. The control cabinet feels really hot. The cooling fan might have failed. Let me check the filters first."
    ],
    "CNC-009": [
        "CNC-9 has a problem. After about two hours of running, the Y-axis drifts about half a millimeter. I think it's thermal expansion on the lead screw. The lubrication lines might be clogged. We need to purge the lines and check the pump pressure, then reset the zero point.",
        "CNC-9 is drifting on the Y-axis. Happens after it warms up. Looks like the lead screw is expanding. Probably a lubrication issue."
    ],
    "MOCK-HYD-04": [
        "I just finished inspecting the hydraulic assembly on Press 4. Found a small pressure drop. The O-ring on the cylinder was fatigued and leaking slightly. Replaced it and pressure is back to normal. System is running smooth now.",
        "Hydraulic Press 4 had a pressure drop. The O-ring was worn out. Replaced it and everything is good now. Just a small fix but important."
    ]
}

def generate_with_gtts():
    """Generate audio files using gTTS"""
    from gtts import gTTS
    generated_files = []
    
    for log_id, scripts in VOICE_SCRIPTS.items():
        for idx, script in enumerate(scripts):
            # Generate filename
            filename = f"{log_id}_v{idx+1}.mp3"
            filepath = AUDIO_DIR / filename
            
            print(f"🎤 Generating: {filename}")
            print(f"   Text: {script[:80]}...")
            
            try:
                # Generate with gTTS
                tts = gTTS(text=script, lang='en', slow=False)
                tts.save(str(filepath))
                generated_files.append(filepath)
                print(f"   ✅ Saved to {filepath}")
                
                # Optional: Convert to WebM if ffmpeg is installed
                if idx == 0:  # Convert first version to WebM
                    webm_file = AUDIO_DIR / f"{log_id}.webm"
                    try:
                        subprocess.run([
                            'ffmpeg', '-i', str(filepath), 
                            '-c:a', 'libopus', 
                            '-b:a', '48k',
                            '-y',
                            str(webm_file)
                        ], capture_output=True, check=True)
                        print(f"   🎵 Converted to WebM: {webm_file}")
                    except (subprocess.CalledProcessError, FileNotFoundError):
                        print(f"   ⚠️  ffmpeg not available, skipping WebM conversion")
                        
            except Exception as e:
                print(f"   ❌ Error: {e}")
    
    return generated_files

def generate_alternate_voices():
    """Generate audio with different accents/voices using gTTS"""
    from gtts import gTTS
    # gTTS supports different TLDs (top-level domains) for accents
    accents = {
        'us': 'com',      # American English
        'uk': 'co.uk',    # British English
        'au': 'com.au',   # Australian English
    }
    
    for log_id, scripts in VOICE_SCRIPTS.items():
        for idx, script in enumerate(scripts[:1]):  # Only first script for each
            for accent_name, tld in accents.items():
                filename = f"{log_id}_{accent_name}.mp3"
                filepath = AUDIO_DIR / filename
                
                print(f"🎤 Generating {accent_name.upper()} accent: {filename}")
                try:
                    tts = gTTS(text=script, lang='en', tld=tld, slow=False)
                    tts.save(str(filepath))
                    print(f"   ✅ Saved")
                except Exception as e:
                    print(f"   ❌ Error: {e}")

def generate_batch_file():
    """Create a batch file for manual voice generation with different tools"""
    batch_commands = []
    
    for log_id, scripts in VOICE_SCRIPTS.items():
        for idx, script in enumerate(scripts):
            mp3_file = f"audio_uploads/{log_id}_v{idx+1}.mp3"
            
            # For Azure TTS (if you have credentials)
            azure_cmd = f'az tts speak --text "{script}" --output {mp3_file}'
            batch_commands.append(f"# {log_id}: {azure_cmd}")
            
            # For Amazon Polly (if installed)
            polly_cmd = f'aws polly synthesize-speech --output-format mp3 --voice-id Joanna --text "{script}" {mp3_file}'
            batch_commands.append(f"# {log_id}: {polly_cmd}")
    
    # Save batch file
    batch_file = AUDIO_DIR / "generate_commands.txt"
    with open(batch_file, 'w') as f:
        f.write("# Voice Generation Commands\n")
        f.write("# Uncomment the commands for your preferred TTS service\n\n")
        f.write("\n".join(batch_commands))
    
    print(f"\n📝 Generated batch commands in {batch_file}")
    print("   Check this file for commands to generate audio with professional TTS services")

def verify_audio_files():
    """Check which audio files were generated"""
    audio_files = list(AUDIO_DIR.glob("*"))
    audio_files = [f for f in audio_files if f.suffix in ['.mp3', '.webm', '.wav']]
    
    print("\n" + "="*50)
    print("📊 Generated Audio Files:")
    print("="*50)
    for f in audio_files:
        size = f.stat().st_size / 1024  # Size in KB
        print(f"  • {f.name} ({size:.1f} KB)")
    
    print(f"\n✅ Total: {len(audio_files)} audio files in {AUDIO_DIR}/")

def update_mock_data_with_urls():
    """Update MOCK_DB_LOGS with audio URLs"""
    print("\n" + "="*50)
    print("📝 To integrate these audio files with your mock data:")
    print("="*50)
    print("\nAdd the audio_url to your MOCK_DB_LOGS in main.py:")
    print("\nExample:")
    
    for log in MOCK_DB_LOGS[:1]:
        log_id = log["id"]
        print(f'\n{log}:')
        print(f'  "audio_url": "/static/audio/{log_id}.webm"')
    
    print("\nOr for multiple versions:")
    print(f'  "audio_url": "/static/audio/{MOCK_DB_LOGS[0]["id"]}_v1.mp3"')
    print("\n💡 Tip: Use WebM for browser compatibility, MP3 for fallback")

if __name__ == "__main__":
    print("🎙️  ShiftSync Voice Dataset Generator")
    print("="*50)
    
    # Install gTTS if not present
    try:
        import gtts
    except ImportError:
        print("⚠️  gTTS not found. Installing...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "gtts"])
        import gtts
    
    # Generate main audio files
    print("\n1. Generating audio files with gTTS...")
    generated = generate_with_gtts()
    
    # Optionally generate with different accents
    print("\n2. Generating with different accents (optional)...")
    choice = input("Generate accent variations? (y/n): ").lower()
    if choice == 'y':
        generate_alternate_voices()
    
    # Verify results
    verify_audio_files()
    
    # Show how to integrate
    update_mock_data_with_urls()
    
    print("\n" + "="*50)
    print("🎯 Next Steps:")
    print("="*50)
    print("1. Place audio files in 'audio_uploads/' directory")
    print("2. Update main.py MOCK_DB_LOGS with audio_url paths")
    print("3. Test playback in Senior/Junior Dashboard")
    print("4. The voice recording will play when users click the play button")
    print("\n✨ Your voice dataset is ready!")