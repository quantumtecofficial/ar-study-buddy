import speech_recognition as sr
import pyttsx3
import threading
import time
from skills import Skills

class Jarvis:
    def __init__(self, socketio=None):
        self.recognizer = sr.Recognizer()
        try:
            self.microphone = sr.Microphone()
            self.has_mic = True
        except OSError:
            print("No microphone detected or PyAudio not installed. Defaulting to text mode.")
            self.microphone = None
            self.has_mic = False
        except AttributeError:
             print("PyAudio not installed. Defaulting to text mode.")
             self.microphone = None
             self.has_mic = False
        self.engine = pyttsx3.init()
        self.skills = Skills()
        self.socketio = socketio
        self.is_listening = False
        self.wake_word = "quantum"
        
        voices = self.engine.getProperty('voices')
        for voice in voices:
            if "Samantha" in voice.name or "Zira" in voice.name:
                self.engine.setProperty('voice', voice.id)
                break
        self.engine.setProperty('rate', 170)

    def speak(self, text):
        print(f"Jarvis: {text}")
        if self.socketio:
            self.socketio.emit('jarvis_speak', {'text': text})

    def listen(self):
        if not self.has_mic:
            time.sleep(1)
            return None

        with self.microphone as source:
            print("Adjusting for ambient noise...")
            try:
                self.recognizer.adjust_for_ambient_noise(source)
                print("Listening...")
                audio = self.recognizer.listen(source, timeout=5, phrase_time_limit=5)
                print("Recognizing...")
                query = self.recognizer.recognize_google(audio).lower()
                print(f"User: {query}")
                if self.socketio:
                    self.socketio.emit('user_speak', {'text': query})
                return query
            except (sr.WaitTimeoutError, sr.UnknownValueError, sr.RequestError, OSError):
                return None

    def process_command(self, query):
        if not query:
            return

        if "search for" in query:
            term = query.replace("search for", "").strip()
            results = self.skills.search_google(term)
            if results:
                summary = results[0]['body']
                self.speak(f"Here is what I found for {term}: {summary}")
                if self.socketio:
                    self.socketio.emit('search_results', {'results': results})
            else:
                self.speak("I couldn't find anything.")
        
        elif "play" in query:
            term = query.replace("play", "").strip()
            response = self.skills.play_youtube(term)
            self.speak(response)

        elif "weather" in query:
            city = "New York"
            if "in" in query:
                city = query.split("in")[-1].strip()
            weather = self.skills.get_weather(city)
            self.speak(weather)

        elif "time" in query:
            self.speak(f"The time is {self.skills.get_time()}")

        elif "open" in query:
            app = query.replace("open", "").strip()
            response = self.skills.system_command(app)
            self.speak(response)

        elif "stop" in query or "exit" in query:
            self.speak("Goodbye, sir.")
            self.is_listening = False

        elif "who made you" in query or "who created you" in query:
            self.speak("Protkarsh, the brilliant boy behind me. He made me.")

        elif "what is your name" in query or "who are you" in query:
            self.speak("My name is Quantum AI.")

        elif "take a note" in query or "write this down" in query:
            note = query.replace("take a note", "").replace("write this down", "").strip()
            if note:
                response = self.skills.take_note(note)
                self.speak(response)
            else:
                self.speak("What should I write down?")

        elif "search wikipedia for" in query:
            term = query.replace("search wikipedia for", "").strip()
            summary = self.skills.search_wikipedia(term)
            self.speak(summary)

        elif "start study timer" in query or "start pomodoro" in query:
            self.speak("Starting Pomodoro timer for 25 minutes. Focus now.")
            if self.socketio:
                self.socketio.emit('start_timer', {'duration': 25})

        else:
            response = self.skills.ask_ai(query)
            self.speak(response)

    def run(self):
        self.is_listening = True
        self.speak("Jarvis is online.")
        
        while self.is_listening:
            query = self.listen()
            if query:
                if self.wake_word in query:
                    command = query.replace(self.wake_word, "").strip()
                    if command:
                        self.process_command(command)
                    else:
                        self.speak("Yes sir?")
                        follow_up = self.listen()
                        if follow_up:
                            self.process_command(follow_up)
                else:
                    pass
            time.sleep(0.1)

    def start_background(self):
        thread = threading.Thread(target=self.run)
        thread.daemon = True
        thread.start()
