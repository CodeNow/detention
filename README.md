# Detention

### Running Locally

You need API_URL and HELLO_RUNNABLE_GITHUB_TOKEN env's set. Then simply run `npm start`

### Navi request general error message response producing service.

Navi will proxy to this service in the event of several types of error scenarios. Detention fetches
the status of an instance from API and produces an error HTML response page.

script to push it
```
function pushDetention {
 echo "$1"
 open https://youtu.be/CV9xF8CjhJk?t=21s; 
 cd ~/runnable/devops-scripts/ansible;
 ansible-playbook -i ./prod-hosts detention.yml -e git_branch="$1";
}
```
