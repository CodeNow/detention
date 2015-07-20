# detention
Handles our 404

script to push it
```
function pushDetention {
 echo "$1"
 open https://youtu.be/CV9xF8CjhJk?t=21s; 
 cd ~/runnable/devops-scripts/ansible;
 ansible-playbook -i ./prod-hosts detention.yml -e git_branch="$1";
}
```
