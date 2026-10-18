# 尋找可用的 Chrome / Chromium：優先 CHROME_PATH 環境變數，其次常見安裝位置，最後回退到 Playwright 內建瀏覽器
import os, shutil

def chrome_path():
    env = os.environ.get('CHROME_PATH') or os.environ.get('BD_CHROME')
    if env and os.path.exists(env):
        return env
    for name in ('google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome', 'msedge'):
        p = shutil.which(name)
        if p:
            return p
    for p in (r'C:\Program Files\Google\Chrome\Application\chrome.exe', r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
              r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'):
        if os.path.exists(p):
            return p
    return None  # Playwright 內建 Chromium

def launch_args():
    p = chrome_path()
    print('browser:', p or 'playwright bundled chromium')
    kw = {'args': ['--allow-file-access-from-files']}
    if p:
        kw['executable_path'] = p
    return kw
