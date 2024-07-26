if(0){const url = new URL(location.href);
url.searchParams.delete('token');
history.replaceState({}, document.title, url.href);}