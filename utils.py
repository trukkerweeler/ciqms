import os

def js_files():
    """
    Returns a list of JavaScript files in the specified directory.
    """
    directory = r"C:\Users\TimK\Documents\CIQMS1\public\js"
    files = [f'"{filename}"' for filename in os.listdir(directory) if os.path.isfile(os.path.join(directory, filename))]
    comma_separated = ', '.join(files)
    print(comma_separated)
    print("=" * 20)

def html_files():
    """
    Returns a list of HTML files in the specified directory.
    """
    directory = r"C:\Users\TimK\Documents\CIQMS1\public"
    files = [f'"{filename}"' for filename in os.listdir(directory)
              if os.path.isfile(os.path.join(directory, filename)) and filename.endswith('.html')]
    comma_separated = ', '.join(files)
    print(comma_separated)
    print("=" * 20)

def css_files():
    """
    Returns a list of CSS files in the specified directory.
    """
    directory = r"C:\Users\TimK\Documents\CIQMS1\public\css"
    files = [f'"{filename}"' for filename in os.listdir(directory)
              if os.path.isfile(os.path.join(directory, filename)) and filename.endswith('.css')]
    comma_separated = ', '.join(files)
    print(comma_separated)
    print("=" * 20)

def route_files():
    """
    Returns a list of route files in the specified directory.
    """
    directory = r"C:\Users\TimK\Documents\CIQMS1\routes"
    files = [f'"{filename}"' for filename in os.listdir(directory)
              if os.path.isfile(os.path.join(directory, filename))]
    comma_separated = ', '.join(files)
    print(comma_separated)
    print("=" * 20)


def copyfiles(source, destination):
    """Copy the files from Documents to the network drive if source is newer or does not exist, excluding .py files."""
    if not os.path.exists(destination):
        os.makedirs(destination)

    only_html = 'html' in destination.lower()

    for item in os.listdir(source):
        source_path = os.path.join(source, item)
        destination_path = os.path.join(destination, item)

        if os.path.isfile(source_path):
            if item.lower().endswith('.py'):
                continue  # Exclude .py files
            if only_html and not item.lower().endswith('.html'):
                continue  # Skip non-html files if destination is for html
            copy = False
            if not os.path.exists(destination_path):
                copy = True
            else:
                src_mtime = os.path.getmtime(source_path)
                dest_mtime = os.path.getmtime(destination_path)
                if src_mtime > dest_mtime:
                    copy = True
            if copy:
                with open(source_path, 'rb') as src_file:
                    with open(destination_path, 'wb') as dest_file:
                        dest_file.write(src_file.read())
                print(f"Copied file: {item}")
        elif os.path.isdir(source_path):
            if not os.path.exists(destination_path):
                os.makedirs(destination_path)
                print(f"Created directory: {item}")


def copypackage():
    """Copy the package.json file to the network drive if it is newer or does not exist."""
    source = r"C:\Users\TimK\Documents\CIQMS1\package.json"
    destination = r"\\fs1\Common\Applications\CIQMS\package.json"

    if not os.path.exists(destination) or os.path.getmtime(source) > os.path.getmtime(destination):
        with open(source, 'rb') as src_file:
            with open(destination, 'wb') as dest_file:
                dest_file.write(src_file.read())
        print("Copied package.json")
    else:
        print("No update needed for package.json")
        
def copyserverjs():
    """Copy the server.js file to the network drive if it is newer or does not exist."""
    source = r"C:\Users\TimK\Documents\CIQMS1\server.js"
    destination = r"\\fs1\Common\Applications\CIQMS\server.js"

    if not os.path.exists(destination) or os.path.getmtime(source) > os.path.getmtime(destination):
        with open(source, 'rb') as src_file:
            with open(destination, 'wb') as dest_file:
                dest_file.write(src_file.read())
        print("Copied server.js")
    else:
        print("No update needed for server.js")

def main():
    # js_files()
    # html_files()
    # css_files()
    # route_files()
    copyfiles(r"C:\Users\TimK\Documents\CIQMS1\public\js", r"\\fs1\Common\Applications\CIQMS\js")
    copyfiles(r"C:\Users\TimK\Documents\CIQMS1\public\json", r"\\fs1\Common\Applications\CIQMS\json")
    copyfiles(r"C:\Users\TimK\Documents\CIQMS1\public\css", r"\\fs1\Common\Applications\CIQMS\css")
    copyfiles(r"C:\Users\TimK\Documents\CIQMS1\routes", r"\\fs1\Common\Applications\CIQMS\routes")
    copyfiles(r"C:\Users\TimK\Documents\CIQMS1\public", r"\\fs1\Common\Applications\CIQMS\html")
    copypackage()
    copyserverjs()

if __name__ == "__main__":
    main()