#!/bin/bash

# Set the folder to store the Lambda function code
OUTPUT_FOLDER="backend"

# Get a list of Lambda functions with the term "anniversify"
FUNCTIONS=$(aws lambda list-functions --output json | jq -r '.Functions[] | select(.FunctionName | contains("anniversify")) | .FunctionName')

# Loop through each function, export its code, and save it in the folder
for FUNCTION_NAME in $FUNCTIONS; do
    echo "Exporting code for Lambda function: $FUNCTION_NAME"
    ZIP_FILE="$OUTPUT_FOLDER/$FUNCTION_NAME.zip"
    FOLDER_NAME="$OUTPUT_FOLDER/$FUNCTION_NAME"

    # Download the zip file
    aws lambda get-function --function-name "$FUNCTION_NAME" --output json | jq -r '.Code.Location' | xargs wget -q -O "$ZIP_FILE"

    # Create the folder if it doesn't exist
    if [ ! -d "$FOLDER_NAME" ]; then
        mkdir "$FOLDER_NAME"
    fi

    # Extract the contents
    unzip -q -o "$ZIP_FILE" -d "$FOLDER_NAME"

    # If the contents are directly in the folder, create a subfolder
    if [ "$(ls -A "$FOLDER_NAME" | wc -l)" -eq 1 ]; then
        SUBFOLDER_NAME="$FOLDER_NAME/$(ls "$FOLDER_NAME")"
        mv "$FOLDER_NAME"/* "$SUBFOLDER_NAME"
    fi
done

# Clean up downloaded zip files
rm -f "$OUTPUT_FOLDER"/*.zip

echo "Code export complete. Check the '$OUTPUT_FOLDER' folder for Lambda function code."