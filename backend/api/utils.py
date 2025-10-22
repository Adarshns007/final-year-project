from flask import jsonify
from datetime import datetime, date

def format_date_to_iso(data):
    """
    Recursively converts datetime and date objects within a dictionary or list
    to ISO 8601 string format, suitable for JSON serialization.

    Args:
        data: A dictionary, list, or single object.

    Returns:
        The formatted dictionary or list.
    """
    if isinstance(data, datetime):
        return data.isoformat()
    if isinstance(data, date):
        return data.isoformat()
    if isinstance(data, dict):
        return {k: format_date_to_iso(v) for k, v in data.items()}
    if isinstance(data, list):
        return [format_date_to_iso(item) for item in data]
    return data

def json_response(data=None, message="Success", status_code=200):
    """
    Creates a standardized JSON response structure for the API.

    Args:
        data (dict/list, optional): The main data payload to return.
        message (str, optional): A descriptive message for the client.
        status_code (int, optional): The HTTP status code to send.

    Returns:
        A Flask Response object.
    """
    if data is None:
        data = {}

    # Format dates before sending
    formatted_data = format_date_to_iso(data)
    
    response_payload = {
        "status": status_code,
        "message": message,
        "data": formatted_data
    }
    
    return jsonify(response_payload), status_code