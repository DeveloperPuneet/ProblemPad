import webview
import tkinter as tk
from tkinter import messagebox, simpledialog
import threading
import sys

URL = "https://problempad.onrender.com/"

class Api:
    def alert(self, message):
        # show an info dialog and return None (alert doesn't need a return)
        root = tk.Tk()
        root.withdraw()
        messagebox.showinfo("Alert", str(message), parent=root)
        root.destroy()

    def confirm(self, message):
        root = tk.Tk()
        root.withdraw()
        result = messagebox.askokcancel("Confirm", str(message), parent=root)
        root.destroy()
        return result  # True/False

    def prompt(self, message, default=""):
        root = tk.Tk()
        root.withdraw()
        response = simpledialog.askstring("Prompt", str(message), initialvalue=default, parent=root)
        root.destroy()
        return response  # string or None

def _inject_protection_js():
    """
    JS that:
    - replaces alert/confirm/prompt to call python API
    - disables right-click context menu
    - blocks ctrl+wheel zoom, ctrl+/- and F12 and Ctrl+Shift+I
    - sets viewport to prevent pinch-zoom on touch devices
    """
    return r"""
    (function(){
      // route built-in dialogs to Python
      if (window.pywebview && window.pywebview.api) {
        window.alert = function(msg){ try { window.pywebview.api.alert(String(msg)); } catch(e){} };
        window.confirm = function(msg){ try { return window.pywebview.api.confirm(String(msg)); } catch(e){ return false; } };
        window.prompt = function(msg, def){ try { return window.pywebview.api.prompt(String(msg), def || ''); } catch(e){ return null; } };
      }

      // disable right-click
      document.addEventListener('contextmenu', function(e){ e.preventDefault(); });

      // prevent zoom via Ctrl + wheel / Ctrl + +/- and pinch zoom
      window.addEventListener('wheel', function(e){
        if (e.ctrlKey) e.preventDefault();
      }, {passive:false});

      window.addEventListener('keydown', function(e){
        // block Ctrl+ / Ctrl- / Ctrl= , F12, Ctrl+Shift+I
        if ((e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=')) ||
            (e.key === 'F12') ||
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i'))) {
          e.preventDefault();
          e.stopPropagation();
        }
      }, true);

      // block pinch-zoom by setting viewport
      (function(){
        var meta = document.querySelector('meta[name=viewport]');
        if (!meta){
          meta = document.createElement('meta');
          meta.name = 'viewport';
          document.head.appendChild(meta);
        }
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0';
      })();
    })();
    """

def on_loaded():
    """called when GUI starts — inject JS into the first window"""
    try:
        # evaluate JS in the window (apply protections)
        if webview.windows:
            w = webview.windows[0]
            w.evaluate_js(_inject_protection_js())
    except Exception as e:
        # if evaluate_js fails silently, print for debug
        print("JS injection failed:", e, file=sys.stderr)

def main():
    api = Api()
    # Create the window. Set a descriptive title and comfortable default size.
    window = webview.create_window("ProblemPad (Desktop)", URL, width=1100, height=700, js_api=api)

    # Start the GUI. on_loaded will run on GUI thread and inject JS after window exists.
    webview.start(on_loaded, window)

if __name__ == "__main__":
    main()
