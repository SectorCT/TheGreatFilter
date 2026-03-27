from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Fix a user\'s username'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='User email')
        parser.add_argument('new_username', type=str, help='New username')

    def handle(self, *args, **options):
        email = options['email']
        new_username = options['new_username']
        
        try:
            user = User.objects.get(email=email)
            old_username = user.username
            user.username = new_username
            user.save()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully changed username from "{old_username}" to "{new_username}" for user {email}'
                )
            )
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'User with email {email} not found')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error: {str(e)}')
            )
