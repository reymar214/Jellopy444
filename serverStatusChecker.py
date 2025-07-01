import socket

def is_server_online(ip, port):
    try:
        with socket.create_connection((ip, port), timeout=3):
            return True
    except (socket.timeout, ConnectionRefusedError):
        return False

server_ip = "18.136.20.146"  # Replace with iRO's actual server IP
ports = [6900]

for port in ports:
    status = "Online" if is_server_online(server_ip, port) else "Offline"
    print(f"Login Server: {port}: {status}")

    import requests
from bs4 import BeautifulSoup

url = 'https://roggh.com'
response = requests.get(url)
soup = BeautifulSoup(response.content, 'html.parser')
links = soup.find_all('a', href=True)

for link in links:
    print(link['href'])
