# Example Python plugin tool

def echo_tool(args: dict) -> dict:
    """Return the input as output."""
    return {"echo": args}

# registration happens at runtime via the Python adapter
