import os
import webbrowser
import platform
import subprocess
import datetime
import requests
from duckduckgo_search import DDGS
from bs4 import BeautifulSoup
from groq import Groq
import wikipedia
from openai import OpenAI

class Skills:
    def __init__(self):
        self.ddgs = DDGS()
        # Initialize Groq (API key from environment variable)
        self.groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))
        # Initialize OpenAI (API key from environment variable)
        self.openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))

    def ask_ai(self, prompt):
        print(f"Asking AI (OpenAI): {prompt}")
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are Jarvis, a helpful, witty, and highly intelligent AI assistant. You are fully bilingual in English and Hindi (including Hinglish). If the user speaks Hindi or Hinglish, reply in natural, conversational Hindi (using Devanagari script where appropriate, or Hinglish if the user prefers). Keep responses concise and conversational."},
                    {"role": "user", "content": prompt}
                ]
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"OpenAI Error: {e}")
            print(f"Falling back to Groq...")
            try:
                chat_completion = self.groq_client.chat.completions.create(
                    messages=[
                        {
                            "role": "system",
                            "content": "You are Jarvis, a helpful, witty, and highly intelligent AI assistant. Keep responses concise and conversational."
                        },
                        {
                            "role": "user",
                            "content": prompt,
                        }
                    ],
                    model="llama3-8b-8192",
                )
                return chat_completion.choices[0].message.content
            except Exception as e:
                print(f"Groq Error: {e}")
                try:
                    print("Falling back to Pollinations...")
                    response = requests.get(f"https://text.pollinations.ai/{prompt}")
                    if response.status_code == 200:
                        return response.text
                except:
                    pass
                return "I am having trouble accessing my neural network."

    def search_google(self, query):
        print(f"Searching for: {query}")
        results = []
        try:
            search_results = self.ddgs.text(query, max_results=5)
            if search_results:
                for r in search_results:
                    results.append({'title': r['title'], 'href': r['href'], 'body': r['body']})
            return results
        except Exception as e:
            print(f"Error searching: {e}")
            return []

    def get_weather(self, city="New York"):
        query = f"weather in {city}"
        try:
            results = self.ddgs.text(query, max_results=1)
            if results:
                return results[0]['body']
            return "I couldn't find the weather information."
        except Exception as e:
            print(f"Error getting weather: {e}")
            return "Sorry, I faced an error getting the weather."

    def play_youtube(self, query):
        print(f"Playing {query} on YouTube")
        try:
            url = f"https://www.youtube.com/results?search_query={query}"
            return f"Playing {query} on YouTube."
        except Exception as e:
            print(f"Error playing YouTube: {e}")
            return "Could not play video."

    def open_website(self, url):
        if not url.startswith('http'):
            url = 'https://' + url
        webbrowser.open(url)
        return f"Opening {url}"

    def get_time(self):
        now = datetime.datetime.now()
        return now.strftime("%I:%M %p")

    def get_date(self):
        now = datetime.datetime.now()
        return now.strftime("%A, %B %d, %Y")

    def system_command(self, command):
        urls = {
            'calculator': 'https://www.online-calculator.com',
            'youtube': 'https://www.youtube.com',
            'whatsapp': 'https://web.whatsapp.com',
            'camera': 'https://webcamtests.com/mirror',
            'chrome': 'https://www.google.com',
            'browser': 'https://www.google.com',
            'gmail': 'https://mail.google.com',
            'maps': 'https://maps.google.com',
            'github': 'https://github.com',
            'twitter': 'https://twitter.com',
            'instagram': 'https://instagram.com',
            'reddit': 'https://reddit.com',
        }
        for key, url in urls.items():
            if key in command:
                return f"Opening {key}. URL: {url}"
        return f"I can try to open that for you. URL: https://www.{command.strip()}.com"

    def summarize_article(self, url):
        try:
            response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
            soup = BeautifulSoup(response.content, 'html.parser')
            paragraphs = soup.find_all('p')
            text = ' '.join([p.get_text() for p in paragraphs])
            summary = text[:500] + "..."
            return summary
        except Exception as e:
            print(f"Error summarizing: {e}")

    def take_note(self, content):
        try:
            with open("notes.txt", "a") as f:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                f.write(f"[{timestamp}] {content}\n")
            return f"Note saved: {content}"
        except Exception as e:
            print(f"Error saving note: {e}")
            return "I couldn't save the note."

    def search_wikipedia(self, query):
        print(f"Searching Wikipedia for: {query}")
        try:
            summary = wikipedia.summary(query, sentences=2)
            return summary
        except wikipedia.exceptions.DisambiguationError as e:
            return f"There are multiple results for {query}. Please be more specific."
        except wikipedia.exceptions.PageError:
            return f"I couldn't find a Wikipedia page for {query}."
        except Exception as e:
            print(f"Wikipedia Error: {e}")
            return "I encountered an error searching Wikipedia."
