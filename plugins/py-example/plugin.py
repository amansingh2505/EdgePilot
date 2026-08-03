# Example Python plugin tool
import sys
import json


def echo_tool(args: dict) -> dict:
    """Return the input as output."""
    return {"echo": args}


# Simple CLI adapter: accept tool id as argv[1], JSON on stdin, output JSON
if __name__ == '__main__':
    try:
        tool_id = sys.argv[1] if len(sys.argv) > 1 else 'example.echo'
        raw = sys.stdin.read()
        args = json.loads(raw) if raw else {}
        if tool_id == 'example.echo':
            res = echo_tool(args)
            print(json.dumps(res))
            sys.exit(0)
        else:
            print(json.dumps({'error': 'unknown_tool'}))
            sys.exit(2)
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(3)
