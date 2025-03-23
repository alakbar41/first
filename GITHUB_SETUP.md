# GitHub Setup Guide

This guide will walk you through the process of downloading your project from Replit and uploading it to your GitHub repository.

## Step 1: Download Your Project from Replit

1. Go to your Replit project page
2. Click on the three dots menu (⋮) in the top-right corner
3. Select "Download as zip"
4. Save the ZIP file to your local machine
5. Extract the ZIP file to a local folder

## Step 2: Set Up Git and GitHub

1. Make sure Git is installed on your computer. If not, download and install it from [git-scm.com](https://git-scm.com/).

2. Create a new repository on GitHub:
   - Go to [github.com](https://github.com/) and sign in
   - Click the "+" icon in the top-right corner and select "New repository"
   - Name your repository (e.g., "ada-university-voting-system")
   - Add a description (optional)
   - Choose whether the repository should be public or private
   - Do NOT initialize the repository with a README, .gitignore, or license
   - Click "Create repository"

3. In your local terminal or command prompt, navigate to your extracted project folder:
   ```bash
   cd path/to/extracted/project
   ```

4. Initialize a Git repository in your project folder:
   ```bash
   git init
   ```

5. Add all files to the Git repository (the .gitignore will automatically exclude files that shouldn't be included):
   ```bash
   git add .
   ```

6. Commit the changes:
   ```bash
   git commit -m "Initial commit"
   ```

7. Link your local repository to your GitHub repository:
   ```bash
   git remote add origin https://github.com/yourusername/your-repository-name.git
   ```
   Replace `yourusername` and `your-repository-name` with your GitHub username and repository name.

8. Push the code to GitHub:
   ```bash
   git push -u origin main
   ```
   Note: If you're using an older version of Git, you might need to use `master` instead of `main`.

## Step 3: Verify Your Repository

1. Go to your GitHub repository page at `https://github.com/yourusername/your-repository-name`
2. Ensure all your files have been uploaded correctly
3. Check that sensitive files like `.env` and Replit-specific files aren't included (they should be excluded by the .gitignore file)

## Step 4: Set Up Environment Variables in Production

If you plan to deploy your application to a hosting service, make sure to set up the environment variables based on the `.env.example` file in your project.

## Congratulations!

Your ADA University Voting System is now properly set up on GitHub, with sensitive information properly excluded. You can now share your repository with others or use it for deployments.